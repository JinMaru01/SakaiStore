import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_DAYS,
  attributionFromUrl,
  encodeAttribution,
  hasAttributionSignal,
  type Attribution,
} from "@/lib/attribution";

/**
 * Attribution cookie writer logic, kept pure so it is unit-testable without a
 * DOM (src/components/marketing/attribution-capture.tsx only feeds it
 * location.href + document.referrer and assigns document.cookie).
 *
 * Model: LAST NON-DIRECT TOUCH WINS (30 days).
 *  - A landing with utm_source, a click id (fbclid/ttclid/gclid) or an
 *    external referrer is a marketing touch → it (re)writes `sk_attr`, so a
 *    later visit from TikTok replaces an older Facebook touch.
 *  - A direct visit (typed URL, bookmark, app switch back from the bank app)
 *    or an internal navigation never overwrites an existing touch.
 * Orders copy the cookie at creation (src/lib/orders/http.ts → createOrder).
 */

/** Browsers cap a cookie at ~4 KB; stay well below so the cookie is never dropped. */
export const MAX_ATTRIBUTION_COOKIE_VALUE = 3000;

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** True when this landing is a new marketing touch (not direct, not internal). */
export function isMarketingTouch(a: Attribution, siteHost: string): boolean {
  if (!hasAttributionSignal(a, siteHost)) return false;
  if (a.utmSource || a.clickId) return true;
  // www.example.com → example.com (or back) is still an internal navigation.
  try {
    return bareHost(new URL(a.referrer!).host) !== bareHost(siteHost);
  } catch {
    return false;
  }
}

function stripQuery(url: string | undefined, max: number): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.slice(0, max);
  } catch {
    return url.split(/[?#]/)[0]!.slice(0, max);
  }
}

/**
 * Encode `a`, dropping the least useful detail until it fits the cookie
 * budget: referrer query, then the landing query (utm values are kept in
 * their own fields), then the click id. Returns null if it still does not fit.
 */
export function encodeAttributionForCookie(a: Attribution, max = MAX_ATTRIBUTION_COOKIE_VALUE): string | null {
  const attempts: Attribution[] = [
    a,
    { ...a, referrer: stripQuery(a.referrer, 200) },
    { ...a, referrer: stripQuery(a.referrer, 200), landingPath: a.landingPath?.split("?")[0]?.slice(0, 200) },
    {
      ...a,
      referrer: stripQuery(a.referrer, 120),
      landingPath: a.landingPath?.split("?")[0]?.slice(0, 120),
      clickId: undefined,
    },
  ];
  for (const attempt of attempts) {
    const value = encodeAttribution(attempt);
    if (value.length <= max) return value;
  }
  return null;
}

export type AttributionCookieInput = {
  /** location.href of the landing page. */
  href: string;
  /** document.referrer ("" when none). */
  referrer?: string | null;
  /** Override the touch timestamp (tests). */
  now?: number;
};

/**
 * The `document.cookie` assignment for this page load, or null when the visit
 * is not a marketing touch (keep whatever touch is already stored). Never throws.
 */
export function attributionCookieFor({ href, referrer, now }: AttributionCookieInput): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const a = attributionFromUrl(url, referrer);
    if (now != null) a.ts = now;
    if (!isMarketingTouch(a, url.host)) return null;
    const value = encodeAttributionForCookie(a);
    if (!value) return null;
    const parts = [
      `${ATTRIBUTION_COOKIE}=${value}`,
      "Path=/",
      `Max-Age=${ATTRIBUTION_MAX_AGE_DAYS * 24 * 60 * 60}`,
      "SameSite=Lax",
    ];
    if (url.protocol === "https:") parts.push("Secure");
    return parts.join("; ");
  } catch {
    return null;
  }
}
