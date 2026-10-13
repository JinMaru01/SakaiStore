/**
 * Marketing attribution. On the first landing of a visit we store where the
 * visitor came from in the `sk_attr` cookie (first-touch, 30 days, see
 * src/components/marketing/attribution-capture.tsx). Order creation copies it
 * onto the order so the admin can see which channel (Facebook, TikTok, ...)
 * actually sells.
 *
 * Shared contract — safe for both server and client.
 */
export const ATTRIBUTION_COOKIE = "sk_attr";
export const ATTRIBUTION_MAX_AGE_DAYS = 30;

export const CHANNELS = ["facebook", "tiktok", "telegram", "google", "direct", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** fbclid / ttclid / gclid */
  clickId?: string;
  referrer?: string;
  landingPath?: string;
  /** epoch ms of first touch */
  ts?: number;
};

const MAX = 120;
const clip = (v: unknown, max = MAX) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

/** Build an Attribution from a landing URL + document.referrer. */
export function attributionFromUrl(url: URL, referrer?: string | null): Attribution {
  const p = url.searchParams;
  return {
    utmSource: clip(p.get("utm_source")),
    utmMedium: clip(p.get("utm_medium")),
    utmCampaign: clip(p.get("utm_campaign")),
    utmContent: clip(p.get("utm_content")),
    utmTerm: clip(p.get("utm_term")),
    clickId: clip(p.get("fbclid") ?? p.get("ttclid") ?? p.get("gclid"), 255),
    referrer: clip(referrer ?? undefined, 500),
    landingPath: clip(url.pathname + url.search, 500),
    ts: Date.now(),
  };
}

/** True when the URL/referrer carries any attribution signal worth storing. */
export function hasAttributionSignal(a: Attribution, siteHost?: string): boolean {
  if (a.utmSource || a.clickId) return true;
  if (!a.referrer) return false;
  try {
    return new URL(a.referrer).host !== siteHost;
  } catch {
    return false;
  }
}

export function encodeAttribution(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

/** Parse the cookie value; never throws. */
export function decodeAttribution(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    if (!v || typeof v !== "object") return null;
    return {
      utmSource: clip(v.utmSource),
      utmMedium: clip(v.utmMedium),
      utmCampaign: clip(v.utmCampaign),
      utmContent: clip(v.utmContent),
      utmTerm: clip(v.utmTerm),
      clickId: clip(v.clickId, 255),
      referrer: clip(v.referrer, 500),
      landingPath: clip(v.landingPath, 500),
      ts: typeof v.ts === "number" ? v.ts : undefined,
    };
  } catch {
    return null;
  }
}

const has = (s: string | undefined, ...needles: string[]) =>
  !!s && needles.some((n) => s.toLowerCase().includes(n));

/** Classify an attribution into one marketing channel. */
export function classifyChannel(a: Attribution | null | undefined): Channel {
  if (!a) return "direct";
  const src = a.utmSource?.toLowerCase();
  if (src) {
    // Short aliases must match exactly ("tt" must not match "twitter").
    const is = (...aliases: string[]) => aliases.includes(src);
    if (has(src, "facebook", "instagram", "messenger") || is("fb", "meta", "ig")) return "facebook";
    if (has(src, "tiktok") || is("tt")) return "tiktok";
    if (has(src, "telegram") || is("tg")) return "telegram";
    if (has(src, "google")) return "google";
    return "other";
  }
  if (a.clickId) {
    // fbclid values are long base64-ish strings; ttclid starts with E.C.P. or similar.
    if (a.landingPath?.includes("fbclid=")) return "facebook";
    if (a.landingPath?.includes("ttclid=")) return "tiktok";
    if (a.landingPath?.includes("gclid=")) return "google";
  }
  const ref = a.referrer;
  if (ref) {
    if (has(ref, "facebook.com", "fb.com", "messenger.com", "instagram.com", "fb.me", "m.me"))
      return "facebook";
    if (has(ref, "tiktok.com")) return "tiktok";
    if (has(ref, "t.me", "telegram.org", "telegram.me")) return "telegram";
    if (has(ref, "google.")) return "google";
    return "other";
  }
  return "direct";
}
