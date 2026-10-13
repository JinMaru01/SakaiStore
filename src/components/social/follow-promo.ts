import "server-only";
import type { PromoCode } from "@/db/schema";
import { findPromoByCode } from "@/lib/orders/promos";
import type { FollowTerms } from "@/components/store/order-form/types";

/**
 * The follower promo code (settings.marketing.followPromoCode) as the
 * storefront advertises it: only when the code exists and can be used right
 * now, together with the conditions customers must see before they rely on it
 * (a minimum order, first top-up only). The code is admin-configurable, so it
 * may be missing, switched off or expired: then nothing is advertised.
 */

export type FollowPromo = { code: string; terms: FollowTerms };

type LiveFields = Pick<PromoCode, "active" | "startsAt" | "endsAt" | "maxUses" | "usedCount" | "gameId">;

/** Whether a promo row can currently be redeemed (optionally on one game). */
export function isPromoLive(promo: LiveFields, now: Date, gameId?: number): boolean {
  if (!promo.active) return false;
  if (promo.startsAt && promo.startsAt > now) return false;
  if (promo.endsAt && promo.endsAt <= now) return false;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
  if (gameId != null && promo.gameId != null && promo.gameId !== gameId) return false;
  return true;
}

export function followTermsOf(promo: Pick<PromoCode, "minOrderCents" | "firstOrderOnly">): FollowTerms {
  return { minOrderCents: Math.max(0, promo.minOrderCents ?? 0), firstOrderOnly: !!promo.firstOrderOnly };
}

export async function getFollowPromo(
  followPromoCode: string,
  opts: { gameId?: number; now?: Date } = {},
): Promise<FollowPromo | null> {
  const wanted = followPromoCode.trim().toUpperCase();
  if (!wanted) return null;
  const promo = await findPromoByCode(wanted);
  if (!promo || !isPromoLive(promo, opts.now ?? new Date(), opts.gameId)) return null;
  return { code: promo.code, terms: followTermsOf(promo) };
}
