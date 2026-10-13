/**
 * Pure helpers for building social share links. Every shared URL is tagged
 * with utm_source=<network>&utm_medium=share so orders that come back from a
 * share are attributed to the right channel (see src/lib/attribution.ts).
 *
 * Safe for both server and client.
 */

export type ShareNetwork = "facebook" | "messenger" | "telegram" | "copy" | "native";

/** utm_source per share target. classifyChannel() maps facebook/messenger -> facebook, telegram -> telegram. */
export const SHARE_UTM_SOURCE: Record<ShareNetwork, string> = {
  facebook: "facebook",
  messenger: "messenger",
  telegram: "telegram",
  copy: "copy_link",
  native: "share_sheet",
};

/** Tracking params we strip before re-tagging, so shares never leak someone else's click ids. */
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "ttclid",
  "gclid",
];

/** Return `url` tagged for a share on `network`. Invalid URLs are returned unchanged. */
export function withShareUtm(url: string, network: ShareNetwork, campaign?: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  for (const p of TRACKING_PARAMS) u.searchParams.delete(p);
  u.searchParams.set("utm_source", SHARE_UTM_SOURCE[network]);
  u.searchParams.set("utm_medium", "share");
  if (campaign) u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

const enc = encodeURIComponent;

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${enc(withShareUtm(url, "facebook"))}`;
}

export function telegramShareUrl(url: string, text?: string): string {
  const base = `https://t.me/share/url?url=${enc(withShareUtm(url, "telegram"))}`;
  return text ? `${base}&text=${enc(text)}` : base;
}

/** Opens the Messenger app share sheet. Only works on mobile devices with Messenger installed. */
export function messengerShareUrl(url: string): string {
  return `fb-messenger://share/?link=${enc(withShareUtm(url, "messenger"))}`;
}

/** Phones and tablets, including the Facebook / Instagram / TikTok in-app browsers. */
export function isMobileUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /Android|iPhone|iPad|iPod|Mobile|FBAN|FBAV|Instagram|BytedanceWebview|musical_ly/i.test(ua);
}

/**
 * In-app browsers (Facebook, Messenger, Instagram, TikTok) often block file
 * downloads, so we show a "press and hold to save" fallback there.
 */
export function isInAppBrowser(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /FBAN|FBAV|FB_IAB|Instagram|BytedanceWebview|musical_ly|TikTok|Line\//i.test(ua);
}
