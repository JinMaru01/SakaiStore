"use client";

import { ArrowDown, ArrowUp, Percent, Plus, Trash2 } from "lucide-react";
import { cloneElement, useId, useRef, useState } from "react";
import { Button, FieldError, Input, Label, Select } from "@/components/ui";
import type { FieldErrors } from "@/lib/admin/forms";
import { adjustPriceCents, MAX_PACKAGES, PACKAGE_BADGES, type PackageFormValues } from "@/lib/admin/game-schema";
import { centsToInput } from "@/lib/admin/format";
import { cn, formatUsd, parseUsdToCents } from "@/lib/utils";

type Props = {
  packages: PackageFormValues[];
  onChange: (next: PackageFormValues[]) => void;
  /** Errors keyed "packages.<index>.<field>" (from the server action). */
  errors: FieldErrors;
  currencyName: string;
};

const BADGE_LABELS: Record<string, string> = { hot: "🔥 Hot", best: "⭐ Best value", new: "New", promo: "Promo" };

let newKeyCounter = 0;
function newPackage(): PackageFormValues {
  newKeyCounter += 1;
  return {
    key: `new-${Date.now()}-${newKeyCounter}`,
    id: null,
    name: "",
    amount: "0",
    bonus: "0",
    price: "",
    compareAt: "",
    badge: "",
    supplierSku: "",
    active: true,
  };
}

/**
 * Package list editor (client state only — nothing is stored until the game
 * is saved, so deletes and bulk price changes can be reviewed first).
 */
export function PackagesEditor({ packages, onChange, errors, currencyName }: Props) {
  const [announcement, setAnnouncement] = useState("");
  const [percent, setPercent] = useState("");
  const [includeCompareAt, setIncludeCompareAt] = useState(true);
  const bulkId = useId();
  const listRef = useRef<HTMLOListElement>(null);

  const update = (index: number, patch: Partial<PackageFormValues>) =>
    onChange(packages.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  function move(index: number, delta: -1 | 1) {
    const j = index + delta;
    if (j < 0 || j >= packages.length) return;
    const next = [...packages];
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange(next);
    setAnnouncement(`${packages[index]!.name || "Package"} moved to position ${j + 1}`);
    // Keep focus on the same arrow of the moved package.
    requestAnimationFrame(() => {
      const btn = listRef.current?.querySelector<HTMLButtonElement>(
        `[data-key="${packages[index]!.key}"] [data-move="${delta === -1 ? "up" : "down"}"]`,
      );
      (btn && !btn.disabled ? btn : listRef.current?.querySelector<HTMLElement>(`[data-key="${packages[index]!.key}"] input`))?.focus();
    });
  }

  function remove(index: number) {
    const removed = packages[index]!;
    onChange(packages.filter((_, i) => i !== index));
    setAnnouncement(`${removed.name || "Package"} removed. It is deleted when you save.`);
  }

  function add() {
    const pkg = newPackage();
    onChange([...packages, pkg]);
    setAnnouncement("Package added at the end of the list");
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLInputElement>(`[data-key="${pkg.key}"] input[name="name"]`)?.focus(),
    );
  }

  const pct = Number(percent);
  const validPct = percent.trim() !== "" && Number.isFinite(pct) && pct !== 0 && pct >= -90 && pct <= 500;

  function applyBulk() {
    if (!validPct) return;
    const shift = (v: string) => {
      const cents = parseUsdToCents(v);
      return cents == null ? v : centsToInput(adjustPriceCents(cents, pct));
    };
    onChange(
      packages.map((p) => ({
        ...p,
        price: shift(p.price),
        compareAt: includeCompareAt && p.compareAt.trim() ? shift(p.compareAt) : p.compareAt,
      })),
    );
    setAnnouncement(`All prices ${pct > 0 ? "raised" : "lowered"} by ${Math.abs(pct)}%. Review and save.`);
    setPercent("");
  }

  const err = (i: number, field: string) => errors[`packages.${i}.${field}`];

  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {errors["packages._form"] && <FieldError>{errors["packages._form"]}</FieldError>}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2/50 p-3.5 sm:flex-row sm:items-end">
        <div className="min-w-0 sm:w-40">
          <Label htmlFor={`${bulkId}-pct`}>Adjust all prices</Label>
          <div className="relative">
            <Input
              id={`${bulkId}-pct`}
              type="number"
              inputMode="decimal"
              step="1"
              min={-90}
              max={500}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              onKeyDown={(e) => {
                // Enter applies the adjustment instead of submitting (saving) the whole game.
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyBulk();
                }
              }}
              placeholder="+5 or -10"
              className="pr-9"
              aria-describedby={`${bulkId}-hint`}
            />
            <Percent className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm sm:h-11">
          <input
            type="checkbox"
            checked={includeCompareAt}
            onChange={(e) => setIncludeCompareAt(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          Also “was” prices
        </label>
        <Button type="button" variant="secondary" onClick={applyBulk} disabled={!validPct || packages.length === 0}>
          Apply
        </Button>
        <p id={`${bulkId}-hint`} className="text-xs text-muted sm:ml-auto sm:max-w-56 sm:text-right">
          Rounded to the nearest 5¢. Nothing is saved until you press Save.
        </p>
      </div>

      {packages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          No packages yet. Add the {currencyName.toLowerCase()} amounts customers can buy.
        </p>
      ) : (
        <ol ref={listRef} className="grid grid-cols-1 gap-3" aria-label="Packages">
          {packages.map((p, i) => {
            const id = `pkg-${p.key}`;
            const priceCents = parseUsdToCents(p.price);
            const total = (Number(p.amount) || 0) + (Number(p.bonus) || 0);
            return (
              <li
                key={p.key}
                data-key={p.key}
                className={cn(
                  "rounded-xl border bg-surface p-3.5",
                  p.active ? "border-border" : "border-dashed border-border/80 opacity-80",
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-7 min-w-7 place-items-center rounded-lg bg-surface-2 px-1.5 text-xs font-semibold text-muted tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                    {p.name || <span className="text-muted">New package</span>}
                    {priceCents != null && <span className="text-muted"> · {formatUsd(priceCents)}</span>}
                    {p.id == null && <span className="ml-2 text-xs text-accent">new</span>}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    data-move="up"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${p.name || "package"} up`}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    data-move="down"
                    onClick={() => move(i, 1)}
                    disabled={i === packages.length - 1}
                    aria-label={`Move ${p.name || "package"} down`}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-danger hover:bg-danger/10"
                    onClick={() => remove(i)}
                    aria-label={`Remove ${p.name || "package"}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                  <PkgField label="Name" id={`${id}-name`} error={err(i, "name")} className="col-span-2 sm:col-span-3">
                    <Input
                      name="name"
                      value={p.name}
                      maxLength={120}
                      required
                      placeholder={`e.g. 86 ${currencyName}`}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                  </PkgField>
                  <PkgField label="Price (USD)" id={`${id}-price`} error={err(i, "price")}>
                    <Input
                      name="price"
                      value={p.price}
                      inputMode="decimal"
                      required
                      placeholder="1.45"
                      onChange={(e) => update(i, { price: e.target.value })}
                    />
                  </PkgField>
                  <PkgField label="Was (USD)" id={`${id}-compare`} error={err(i, "compareAt")} optional>
                    <Input
                      name="compareAt"
                      value={p.compareAt}
                      inputMode="decimal"
                      placeholder="—"
                      onChange={(e) => update(i, { compareAt: e.target.value })}
                    />
                  </PkgField>
                  <PkgField label="Amount" id={`${id}-amount`} error={err(i, "amount")}>
                    <Input
                      name="amount"
                      value={p.amount}
                      inputMode="numeric"
                      onChange={(e) => update(i, { amount: e.target.value })}
                    />
                  </PkgField>
                  <PkgField label="Bonus" id={`${id}-bonus`} error={err(i, "bonus")}>
                    <Input
                      name="bonus"
                      value={p.bonus}
                      inputMode="numeric"
                      onChange={(e) => update(i, { bonus: e.target.value })}
                    />
                  </PkgField>
                  <PkgField label="Badge" id={`${id}-badge`} error={err(i, "badge")}>
                    <Select name="badge" value={p.badge} onChange={(e) => update(i, { badge: e.target.value })}>
                      <option value="">None</option>
                      {PACKAGE_BADGES.map((b) => (
                        <option key={b} value={b}>
                          {BADGE_LABELS[b]}
                        </option>
                      ))}
                      {p.badge && !(PACKAGE_BADGES as readonly string[]).includes(p.badge) && (
                        <option value={p.badge}>{p.badge}</option>
                      )}
                    </Select>
                  </PkgField>
                  <div className="flex items-end sm:col-span-2">
                    <label className="flex h-11 items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) => update(i, { active: e.target.checked })}
                        className="h-5 w-5 accent-[var(--color-primary)]"
                      />
                      Active
                      <span className="sr-only">(visible in store)</span>
                    </label>
                  </div>
                </div>
                {/* Rarely needed (future supplier API), so it stays out of the way on phones. */}
                <details className="mt-2" open={!!p.supplierSku || !!err(i, "supplierSku") || undefined}>
                  <summary className="cursor-pointer text-xs text-muted hover:text-fg">Supplier SKU</summary>
                  <PkgField label="Supplier SKU" id={`${id}-sku`} error={err(i, "supplierSku")} optional className="mt-2 max-w-xs">
                    <Input
                      name="supplierSku"
                      value={p.supplierSku}
                      maxLength={64}
                      onChange={(e) => update(i, { supplierSku: e.target.value })}
                    />
                  </PkgField>
                </details>
                {total > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    Customer gets {total.toLocaleString("en-US")} {currencyName}
                    {Number(p.bonus) > 0 && ` (${Number(p.amount) || 0} + ${Number(p.bonus)} bonus)`}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <Button type="button" variant="outline" onClick={add} disabled={packages.length >= MAX_PACKAGES}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add package
        </Button>
      </div>
    </div>
  );
}

function PkgField({
  label,
  id,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const child = cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  });
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={id} className="mb-1 text-xs text-muted">
        {label}
        {optional && <span className="sr-only"> (optional)</span>}
      </Label>
      {child}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
