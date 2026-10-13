import type { PromoCode } from "@/db/schema";
import type { MarketingSettings, SocialSettings } from "@/lib/settings";
import { validMetaPixelId, validTikTokPixelId } from "@/lib/tracking/pixels";
import { describeOffer, isPromoLive, toPromoOffer } from "./promo-offer";

/**
 * "Ready to promote?" checklist on /admin/marketing. Pure (the page loads
 * the inputs) so every rule is unit-tested. Each item links to the fix and
 * to the matching playbook section (anchors in docs/SOCIAL_MEDIA_PLAYBOOK.md).
 */

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  /** Current value when done, what to do when not. */
  detail: string;
  /** Where to fix it in the admin. */
  action?: { href: string; label: string };
  /** Heading anchor in the playbook. */
  playbook: string;
};

export type ChecklistInput = {
  social: Pick<SocialSettings, "facebookUrl" | "tiktokUrl" | "messengerUrl">;
  marketing: Pick<MarketingSettings, "followPromoCode">;
  /** Raw env values (validated here). */
  pixels: { meta?: string | null; tiktok?: string | null };
  /** The promo_codes row of marketing.followPromoCode, if it exists. */
  followPromo: PromoCode | null;
  /** All promo codes tagged with a channel. */
  channelPromos: PromoCode[];
  now?: Date;
};

/** Playbook anchors (GitHub-style heading slugs). Kept in one place so a test can check they exist. */
export const PLAYBOOK_ANCHORS = {
  facebookPage: "2-set-up-the-facebook-page",
  messenger: "messenger-instant-reply-and-saved-replies",
  tiktok: "3-set-up-the-tiktok-business-account",
  metaPixel: "4-meta-pixel-and-domain-verification",
  tiktokPixel: "5-tiktok-pixel",
  promoCodes: "6-channel-promo-codes",
} as const;

function hostIs(url: string, ...hosts: string[]): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    // www.facebook.com / m.facebook.com → facebook.com, but keep m.me as is.
    const full = u.hostname.toLowerCase();
    const bare = full.replace(/^(www|m|web)\./, "");
    return hosts.includes(bare.includes(".") ? bare : full);
  } catch {
    return false;
  }
}

const SETTINGS = { href: "/admin/settings", label: "Open settings" };
const PROMOS = { href: "/admin/promos", label: "Promo codes" };

function pixelItem(
  id: string,
  label: string,
  envName: string,
  raw: string | null | undefined,
  valid: string | null,
  rule: string,
  playbook: string,
): ChecklistItem {
  if (valid) return { id, label, done: true, detail: `Pixel ${valid} is installed on every store page.`, playbook };
  const detail = raw?.trim()
    ? `${envName} is set but is not a valid Pixel ID (${rule}), so the pixel is NOT loaded.`
    : `Set ${envName} on your hosting and redeploy, so ads can measure purchases.`;
  return { id, label, done: false, detail, playbook };
}

export function buildSetupChecklist(input: ChecklistInput): ChecklistItem[] {
  const { social, marketing, pixels, followPromo, channelPromos } = input;
  const now = input.now ?? new Date();
  const items: ChecklistItem[] = [];

  const fb = social.facebookUrl.trim();
  items.push({
    id: "facebook_url",
    label: "Facebook Page link",
    done: hostIs(fb, "facebook.com", "fb.com"),
    detail: hostIs(fb, "facebook.com", "fb.com")
      ? fb
      : fb
        ? "The Facebook link does not point to facebook.com — use your Page URL."
        : "Add your Page URL (Settings → Social links) so the site shows “Follow us”.",
    action: SETTINGS,
    playbook: PLAYBOOK_ANCHORS.facebookPage,
  });

  const messenger = social.messengerUrl.trim();
  items.push({
    id: "messenger_url",
    label: "Messenger chat link",
    done: hostIs(messenger, "m.me", "messenger.com"),
    detail: hostIs(messenger, "m.me", "messenger.com")
      ? messenger
      : "Add your m.me/<page> link so customers can chat from the floating chat button.",
    action: SETTINGS,
    playbook: PLAYBOOK_ANCHORS.messenger,
  });

  const tt = social.tiktokUrl.trim();
  const ttOk = hostIs(tt, "tiktok.com") && /\/@[\w.-]+/.test(tt);
  items.push({
    id: "tiktok_url",
    label: "TikTok account link",
    done: ttOk,
    detail: ttOk ? tt : tt ? "Use your profile URL: https://www.tiktok.com/@yourname" : "Add your TikTok profile URL (Settings → Social links).",
    action: SETTINGS,
    playbook: PLAYBOOK_ANCHORS.tiktok,
  });

  items.push(
    pixelItem(
      "meta_pixel",
      "Meta Pixel",
      "NEXT_PUBLIC_FB_PIXEL_ID",
      pixels.meta,
      validMetaPixelId(pixels.meta),
      "digits only",
      PLAYBOOK_ANCHORS.metaPixel,
    ),
  );
  items.push(
    pixelItem(
      "tiktok_pixel",
      "TikTok Pixel",
      "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
      pixels.tiktok,
      validTikTokPixelId(pixels.tiktok),
      "capital letters and digits",
      PLAYBOOK_ANCHORS.tiktokPixel,
    ),
  );

  const follow = marketing.followPromoCode.trim().toUpperCase();
  let followDetail: string;
  let followDone = false;
  if (!follow) followDetail = "Pick a follower code (e.g. FOLLOW10) in Settings → Marketing.";
  else if (!followPromo) followDetail = `${follow} does not exist yet — create it under Promo codes.`;
  else if (!isPromoLive(followPromo, now)) {
    followDetail = `${follow} exists but cannot be used right now (inactive, expired, not started or used up).`;
  } else {
    followDone = true;
    followDetail = `${follow}: ${describeOffer(toPromoOffer(followPromo), "en")}${followPromo.gameId ? " (one game only)" : ""}.`;
  }
  items.push({
    id: "follow_code",
    label: "Follower promo code",
    done: followDone,
    detail: followDetail,
    action: follow ? PROMOS : SETTINGS,
    playbook: PLAYBOOK_ANCHORS.promoCodes,
  });

  const live = (channel: string) =>
    channelPromos.filter((p) => p.channel === channel && isPromoLive(p, now)).map((p) => p.code);
  const fbCodes = live("facebook");
  const ttCodes = live("tiktok");
  const missing = [fbCodes.length ? null : "Facebook", ttCodes.length ? null : "TikTok"].filter(Boolean);
  items.push({
    id: "channel_codes",
    label: "Channel promo codes",
    done: missing.length === 0,
    detail:
      missing.length === 0
        ? `Facebook: ${fbCodes.join(", ")} · TikTok: ${ttCodes.join(", ")}`
        : `Create a live code with channel ${missing.join(" and ")} (e.g. FB5 / TIKTOK5) so “direct” orders still show which platform sold.`,
    action: PROMOS,
    playbook: PLAYBOOK_ANCHORS.promoCodes,
  });

  return items;
}
