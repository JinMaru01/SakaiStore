"use client";

import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input, Select } from "@/components/ui";
import { describeDiscount, PROMO_CHANNELS, type PromoFormValues } from "@/lib/admin/promo-schema";
import { cn, formatUsd, parseUsdToCents } from "@/lib/utils";
import { CHANNEL_LABELS } from "./badges";
import { Field, Switch } from "./field";
import { fieldError, FormMessage } from "./form-message";
import { ConfirmSubmitButton, SubmitButton } from "./submit-button";
import { useAdminAction, type AdminAction } from "./use-admin-action";

type Props = {
  action: AdminAction;
  initial: PromoFormValues;
  games: { id: number; name: string; active: boolean }[];
  isNew: boolean;
};

/** Plain-language summary of what the customer gets, updated as the owner types. */
function preview(v: PromoFormValues): string | null {
  const minCents = v.minOrder.trim() ? parseUsdToCents(v.minOrder) : 0;
  let discount: string | null = null;
  if (v.type === "percent") {
    const n = Number(v.value.replace(/%$/, ""));
    if (Number.isInteger(n) && n >= 1 && n <= 100) {
      const cap = v.maxDiscount.trim() ? parseUsdToCents(v.maxDiscount) : null;
      discount = describeDiscount({ type: "percent", value: n, maxDiscountCents: cap });
    }
  } else {
    const cents = parseUsdToCents(v.value);
    if (cents) discount = describeDiscount({ type: "fixed", value: cents, maxDiscountCents: null });
  }
  if (!discount) return null;
  return `${discount}${minCents ? ` on orders from ${formatUsd(minCents)}` : ""}`;
}

export function PromoForm({ action, initial, games, isNew }: Props) {
  const [v, setV] = useState(initial);
  const { state, pending, onSubmit } = useAdminAction(action);
  const set = (patch: Partial<PromoFormValues>) => setV((cur) => ({ ...cur, ...patch }));
  const err = (k: string) => fieldError(state, k);
  const summary = preview(v);

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Code" error={err("code")} hint="Customers type this at checkout. A–Z, 0–9, _ and -.">
          <Input
            name="code"
            value={v.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, "") })}
            maxLength={32}
            required
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="font-mono uppercase"
            placeholder="TIKTOK10"
          />
        </Field>
        <Field label="Shown to customers" error={err("description")} optional hint="e.g. 10% off for TikTok followers">
          <Input name="description" value={v.description} onChange={(e) => set({ description: e.target.value })} maxLength={300} />
        </Field>
      </div>

      <fieldset className="grid grid-cols-1 gap-4 rounded-xl border border-border p-3.5 sm:grid-cols-3">
        <legend className="px-1 text-sm font-medium">Discount</legend>
        <Field label="Type" error={err("type")}>
          <Select name="type" value={v.type} onChange={(e) => set({ type: e.target.value === "fixed" ? "fixed" : "percent" })}>
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount (USD)</option>
          </Select>
        </Field>
        <Field label={v.type === "percent" ? "Percent off" : "Amount off (USD)"} error={err("value")}>
          <Input
            name="value"
            value={v.value}
            onChange={(e) => set({ value: e.target.value })}
            inputMode="decimal"
            required
            placeholder={v.type === "percent" ? "10" : "1.00"}
          />
        </Field>
        {v.type === "percent" ? (
          <Field label="Max discount (USD)" error={err("maxDiscount")} optional hint="Caps big orders.">
            <Input name="maxDiscount" value={v.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} inputMode="decimal" placeholder="2.00" />
          </Field>
        ) : (
          <input type="hidden" name="maxDiscount" value="" />
        )}
        <Field label="Minimum order (USD)" error={err("minOrder")} optional>
          <Input name="minOrder" value={v.minOrder} onChange={(e) => set({ minOrder: e.target.value })} inputMode="decimal" placeholder="0.00" />
        </Field>
        <Field label="Max uses" error={err("maxUses")} optional hint="Empty = unlimited. Counted when an order is paid.">
          <Input name="maxUses" value={v.maxUses} onChange={(e) => set({ maxUses: e.target.value })} inputMode="numeric" placeholder="∞" />
        </Field>
        <p
          className={cn(
            "self-end rounded-xl px-3 py-2.5 text-sm sm:col-span-3",
            summary ? "bg-primary/10 text-fg ring-1 ring-primary/30 ring-inset" : "bg-surface-2 text-muted",
          )}
          aria-live="polite"
        >
          {summary ? `Customers get ${summary}.` : "Enter a discount to see a preview."}
        </p>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Game" error={err("gameId")} hint="Limit the code to one game, or allow all.">
          <Select name="gameId" value={v.gameId} onChange={(e) => set({ gameId: e.target.value })}>
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
                {g.active ? "" : " (hidden)"}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Promoted on"
          error={err("channel")}
          hint="Orders using this code with no other source count toward this channel in analytics."
        >
          <Select name="channel" value={v.channel} onChange={(e) => set({ channel: e.target.value })}>
            <option value="">Not channel-specific</option>
            {PROMO_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Starts" error={err("startsAt")} optional hint="Phnom Penh time. Empty = immediately.">
          <Input name="startsAt" type="datetime-local" value={v.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </Field>
        <Field label="Ends" error={err("endsAt")} optional hint="Phnom Penh time. Empty = never.">
          <Input name="endsAt" type="datetime-local" value={v.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
        </Field>
      </div>

      <Switch
        name="active"
        label="Active"
        description="Turn off to pause the code without deleting it."
        checked={v.active}
        onChange={(active) => set({ active })}
      />

      {state.status === "error" && <FormMessage state={state} />}

      <div>
        <SubmitButton pending={pending} size="lg">
          <Save className="h-4 w-4" aria-hidden="true" />
          {isNew ? "Create promo code" : "Save changes"}
        </SubmitButton>
      </div>
    </form>
  );
}

/** Delete with a two-tap confirmation (orders keep the code text in their history). */
export function DeletePromoForm({ action, promoId, code }: { action: AdminAction; promoId: number; code: string }) {
  const { state, pending, onSubmit } = useAdminAction(action);
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <input type="hidden" name="promoId" value={promoId} />
      <p className="text-sm text-muted">
        Deleting <span className="font-mono text-fg">{code}</span> stops it working immediately. Past orders keep the
        code in their history. To pause it instead, switch off Active.
      </p>
      {state.status === "error" && <FormMessage state={state} />}
      <div>
        <ConfirmSubmitButton variant="danger" confirmLabel="Tap again to delete" pending={pending}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete code
        </ConfirmSubmitButton>
      </div>
    </form>
  );
}
