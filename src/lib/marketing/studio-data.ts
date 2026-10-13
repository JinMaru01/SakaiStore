import "server-only";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { promoCodes, type PromoCode } from "@/db/schema";
import { isPromoLive, toPromoOffer, type PromoOffer } from "./promo-offer";

/** Data helpers for the admin Marketing studio (/admin/marketing). Server-only. */

export async function listPromoCodes(): Promise<PromoCode[]> {
  return db.select().from(promoCodes).orderBy(asc(promoCodes.code));
}

export type StudioPromoOption = {
  code: string;
  channel: string | null;
  /** "FB5 · Facebook · 5% off (up to $2.00)" */
  label: string;
  offer: PromoOffer;
};

const CHANNEL_NAMES: Record<string, string> = { facebook: "Facebook", tiktok: "TikTok", telegram: "Telegram", other: "Other" };

/** Codes that can be advertised right now (live), for the image / caption pickers. */
export function livePromoOptions(codes: PromoCode[], now: Date = new Date()): StudioPromoOption[] {
  return codes
    .filter((p) => isPromoLive(p, now))
    .map((p) => {
      const offer = toPromoOffer(p);
      const pct = offer.type === "percent" ? `${offer.value}% off` : `$${(offer.value / 100).toFixed(2)} off`;
      const channel = p.channel ? CHANNEL_NAMES[p.channel] ?? p.channel : null;
      return { code: offer.code, channel: p.channel, label: [offer.code, channel, pct].filter(Boolean).join(" · "), offer };
    });
}

/**
 * Default code per platform: the platform's own channel code (orders then
 * show which platform sold even when the visit looks "direct"), else the
 * follower code.
 */
export function defaultPlatformCodes(
  options: StudioPromoOption[],
  followCode: string,
): { facebook: string | null; tiktok: string | null } {
  const follow = followCode.trim().toUpperCase();
  const followLive = options.some((o) => o.code === follow) ? follow : null;
  const pick = (channel: string) => options.find((o) => o.channel === channel && o.code !== follow)?.code ?? followLive;
  return { facebook: followLive ?? pick("facebook"), tiktok: pick("tiktok") };
}

/**
 * Cache-buster for promo image URLs: changes whenever a game, package,
 * promo code or setting changes, so previews refresh after edits but are
 * otherwise served from the browser cache.
 */
export async function contentVersion(): Promise<string> {
  const result = await db.execute<{ v: string | Date | null }>(
    sql`select greatest(
      (select max(updated_at) from games),
      (select max(updated_at) from packages),
      (select max(updated_at) from promo_codes),
      (select max(updated_at) from settings)
    ) as v`,
  );
  const v = result.rows[0]?.v;
  const ms = v ? new Date(v).getTime() : 0;
  return Number.isFinite(ms) ? ms.toString(36) : "0";
}
