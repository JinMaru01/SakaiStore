import type { PromoCode } from "@/db/schema";

/**
 * Pure pricing rules (no DB) so they are trivially unit-testable and shared
 * by POST /api/promo/validate and createOrder — the price the customer sees
 * in the promo preview is exactly the price the server charges.
 */

export const PROMO_ERRORS = [
  "not_found",
  "inactive",
  "not_started",
  "expired",
  "used_up",
  "min_order",
  "not_applicable",
] as const;
export type PromoError = (typeof PROMO_ERRORS)[number];

export type PromoEvaluation = { ok: true; discountCents: number } | { ok: false; error: PromoError };

export type PromoContext = {
  subtotalCents: number;
  gameId: number;
  now?: Date;
};

/** Promo codes are case-insensitive and stored UPPERCASE: " fb5 " → "FB5". */
export function normalizePromoCode(input: string | null | undefined): string {
  return typeof input === "string" ? input.replace(/\s+/g, "").toUpperCase() : "";
}

/** The order total never drops below 1 cent (a 0.00 KHQR cannot be paid). */
export const MIN_TOTAL_CENTS = 1;

/** Largest discount allowed for a subtotal: keeps total ≥ MIN_TOTAL_CENTS. */
export function clampDiscount(discountCents: number, subtotalCents: number): number {
  const max = Math.max(0, subtotalCents - MIN_TOTAL_CENTS);
  if (!Number.isFinite(discountCents)) return 0;
  return Math.min(max, Math.max(0, Math.floor(discountCents)));
}

/** Discount the promo gives on a subtotal, ignoring eligibility rules. */
export function computeDiscount(
  promo: Pick<PromoCode, "type" | "value" | "maxDiscountCents">,
  subtotalCents: number,
): number {
  let discount: number;
  if (promo.type === "percent") {
    const percent = Math.min(100, Math.max(0, promo.value));
    // Round down: never give more than the advertised percentage.
    discount = Math.floor((subtotalCents * percent) / 100);
    if (promo.maxDiscountCents != null && promo.maxDiscountCents >= 0) {
      discount = Math.min(discount, promo.maxDiscountCents);
    }
  } else {
    discount = Math.max(0, promo.value);
  }
  return clampDiscount(discount, subtotalCents);
}

/**
 * Check a promo code against an order and compute its discount. Checks run
 * from "is this code usable at all" to "does it fit this order", so the
 * customer sees the most relevant reason first.
 */
export function evaluatePromo(promo: PromoCode | null | undefined, ctx: PromoContext): PromoEvaluation {
  if (!promo) return { ok: false, error: "not_found" };
  const now = ctx.now ?? new Date();
  if (!promo.active) return { ok: false, error: "inactive" };
  if (promo.startsAt && promo.startsAt.getTime() > now.getTime()) return { ok: false, error: "not_started" };
  if (promo.endsAt && promo.endsAt.getTime() <= now.getTime()) return { ok: false, error: "expired" };
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return { ok: false, error: "used_up" };
  if (promo.gameId != null && promo.gameId !== ctx.gameId) return { ok: false, error: "not_applicable" };
  if (ctx.subtotalCents < (promo.minOrderCents ?? 0)) return { ok: false, error: "min_order" };
  return { ok: true, discountCents: computeDiscount(promo, ctx.subtotalCents) };
}
