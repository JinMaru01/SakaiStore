import type { PromoCode } from "@/db/schema";
import { evaluatePromo, normalizePromoCode } from "@/lib/orders/pricing";
import { formatUsd } from "@/lib/utils";

/**
 * Human wording for a promo code's offer (captions, promo images). Pure; safe
 * for server and client. Prices are honest: we only advertise codes that are
 * currently usable and describe their caps / minimums.
 */

export type PromoOffer = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  maxDiscountCents: number | null;
  minOrderCents: number;
  /** Code restricted to one game (null = every game). */
  gameId: number | null;
  /** Marketing channel the code is promoted on (facebook | tiktok | telegram | other). */
  channel: string | null;
};

export function toPromoOffer(
  p: Pick<PromoCode, "code" | "type" | "value" | "maxDiscountCents" | "minOrderCents" | "gameId" | "channel">,
): PromoOffer {
  return {
    code: normalizePromoCode(p.code),
    type: p.type,
    value: p.value,
    maxDiscountCents: p.maxDiscountCents,
    minOrderCents: p.minOrderCents ?? 0,
    gameId: p.gameId,
    channel: p.channel,
  };
}

/**
 * Active, started, not expired and not used up right now. Order-specific
 * rules (game, minimum) are ignored here — they are part of the wording.
 */
export function isPromoLive(promo: PromoCode | null | undefined, now: Date = new Date()): boolean {
  if (!promo) return false;
  const result = evaluatePromo(promo, {
    subtotalCents: Number.MAX_SAFE_INTEGER,
    gameId: promo.gameId ?? 0,
    now,
  });
  return result.ok;
}

/** Can `offer` be advertised on a post for `gameId` (null = all games)? */
export function offerAppliesTo(offer: Pick<PromoOffer, "gameId">, gameId: number | null): boolean {
  return offer.gameId == null || offer.gameId === gameId;
}

/** "10% OFF" / "$1.00 OFF" — for big image callouts. */
export function offerHeadline(offer: Pick<PromoOffer, "type" | "value">): string {
  return offer.type === "percent" ? `${offer.value}% OFF` : `${formatUsd(offer.value)} OFF`;
}

/** Caps and minimums as a short English line: "Max $2.00 · orders from $5.00". */
export function offerConditions(offer: Pick<PromoOffer, "type" | "maxDiscountCents" | "minOrderCents">): string {
  const parts: string[] = [];
  if (offer.type === "percent" && offer.maxDiscountCents != null && offer.maxDiscountCents > 0) {
    parts.push(`Max ${formatUsd(offer.maxDiscountCents)}`);
  }
  if (offer.minOrderCents > 0) parts.push(`orders from ${formatUsd(offer.minOrderCents)}`);
  return parts.join(" · ");
}

/** Full sentence fragment in English or Khmer: "10% off (up to $2.00) on orders from $5.00". */
export function describeOffer(
  offer: Pick<PromoOffer, "type" | "value" | "maxDiscountCents" | "minOrderCents">,
  lang: "en" | "km",
): string {
  const cap =
    offer.type === "percent" && offer.maxDiscountCents != null && offer.maxDiscountCents > 0
      ? formatUsd(offer.maxDiscountCents)
      : null;
  const min = offer.minOrderCents > 0 ? formatUsd(offer.minOrderCents) : null;
  if (lang === "km") {
    const amount = offer.type === "percent" ? `${offer.value}%` : formatUsd(offer.value);
    return [`បញ្ចុះ ${amount}`, cap && `(រហូតដល់ ${cap})`, min && `សម្រាប់ការកុម្ម៉ង់ចាប់ពី ${min}`]
      .filter(Boolean)
      .join(" ");
  }
  const amount = offer.type === "percent" ? `${offer.value}% off` : `${formatUsd(offer.value)} off`;
  return [amount, cap && `(up to ${cap})`, min && `on orders from ${min}`].filter(Boolean).join(" ");
}
