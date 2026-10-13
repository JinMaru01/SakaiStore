"use client";

import { CircleCheck, Crown, Flame, Gem, Percent, Sparkles } from "lucide-react";
import { useT } from "@/i18n/client";
import type { TranslateFn } from "@/i18n/translate";
import { cn, formatKhr, formatNumber, formatUsd } from "@/lib/utils";
import { Step } from "./step";
import type { FormPackage } from "./types";

const BADGES: Record<string, { Icon: typeof Flame; className: string }> = {
  hot: { Icon: Flame, className: "bg-gradient-to-r from-[#ff5a3c] to-[#ff2d78] text-white" },
  best: { Icon: Crown, className: "bg-gradient-to-r from-[#f5a524] to-[#ffcf5c] text-[#2a1a00]" },
  new: { Icon: Sparkles, className: "bg-accent text-[#032830]" },
  promo: { Icon: Percent, className: "bg-success text-[#03230f]" },
};

function PackageBadge({ badge }: { badge: string }) {
  const t = useT();
  const key = badge.trim().toLowerCase();
  const known = BADGES[key];
  const label = known ? t(`game.badges.${key}`) : badge;
  const Icon = known?.Icon;
  return (
    <span
      className={cn(
        "absolute -top-2.5 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-md",
        known?.className ?? "bg-primary text-primary-fg",
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  );
}

/**
 * Package names already state the total the customer gets ("86 Diamonds" =
 * 78 + 8 bonus), so the chip explains the split instead of reading as extra
 * on top ("+8 bonus" made customers expect 94). Names are admin-authored and
 * may not equal amount + bonus, so never compute a total here.
 */
export function bonusLabel(t: TranslateFn, p: Pick<FormPackage, "amount" | "bonus">): string {
  const bonus = formatNumber(p.bonus);
  return p.amount > 0
    ? t("game.packages.bonusBreakdown", { base: formatNumber(p.amount), bonus })
    : t("game.packages.bonusIncluded", { bonus });
}

type Props = {
  packages: FormPackage[];
  selectedId: number | null;
  khrPerUsd: number;
  error: boolean;
  onSelect: (p: FormPackage) => void;
};

/**
 * Package picker. Native radio inputs (visually hidden) give us correct
 * radio-group semantics and keyboard support (arrow keys) for free.
 */
export function PackageGrid({ packages, selectedId, khrPerUsd, error, onSelect }: Props) {
  const t = useT();
  return (
    <Step n={2} id="step-package" title={t("game.steps.package")} asFieldset>
      {packages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {t("game.packages.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {packages.map((p) => {
            const selected = p.id === selectedId;
            const save =
              p.compareAtCents && p.compareAtCents > p.priceCents
                ? Math.round(((p.compareAtCents - p.priceCents) / p.compareAtCents) * 100)
                : 0;
            return (
              <label
                key={p.id}
                className={cn(
                  "relative flex min-h-28 cursor-pointer flex-col rounded-2xl border bg-surface-2/50 p-3 pt-3.5 transition-all sm:p-3.5",
                  "hover:border-primary/60 hover:bg-surface-2",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                  selected
                    ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]"
                    : error
                      ? "border-danger/60"
                      : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="package"
                  value={p.id}
                  checked={selected}
                  onChange={() => onSelect(p)}
                  className="sr-only"
                />
                {p.badge && <PackageBadge badge={p.badge} />}
                <span className="flex items-start gap-2">
                  <Gem
                    className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "text-accent" : "text-primary")}
                    aria-hidden="true"
                  />
                  <span className="text-sm leading-snug font-semibold text-fg sm:text-[15px]">{p.name}</span>
                </span>
                {p.bonus > 0 && (
                  <span className="mt-1.5 inline-flex w-fit items-center rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-semibold text-success">
                    {bonusLabel(t, p)}
                  </span>
                )}
                <span className="mt-auto pt-2.5">
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-display text-lg font-bold text-fg">{formatUsd(p.priceCents)}</span>
                    {save > 0 && (
                      <>
                        <s className="text-xs text-muted">
                          <span className="sr-only">{t("game.packages.was")} </span>
                          {formatUsd(p.compareAtCents!)}
                        </s>
                        <span className="text-[11px] font-bold text-success">-{save}%</span>
                      </>
                    )}
                  </span>
                  <span className="block text-xs text-muted">≈ {formatKhr(p.priceCents, khrPerUsd)}</span>
                </span>
                {selected && (
                  <CircleCheck
                    className="absolute right-2.5 bottom-2.5 h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                )}
              </label>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t("game.errors.select_package")}
        </p>
      )}
    </Step>
  );
}
