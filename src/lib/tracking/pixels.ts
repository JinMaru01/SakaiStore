/**
 * Meta Pixel + TikTok Pixel configuration, base code and event mapping.
 * Pure; safe for server and client (unit-tested in pixels.test.ts).
 *
 * Pixel ids are interpolated into an inline <script>, so they must pass a
 * strict format check first (Meta: digits only, TikTok: [A-Z0-9]). Anything
 * else is treated as "not configured" — never escaped-and-used — so a typo or
 * a malicious env value can never inject script.
 */

export type TrackEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Contact" | "Lead";

export type TrackParams = {
  contentId?: string;
  contentName?: string;
  /** USD amount, e.g. 1.5 */
  value?: number;
  currency?: "USD";
  orderCode?: string;
};

export type PixelConfig = { metaPixelId: string | null; tiktokPixelId: string | null };

const META_PIXEL_ID = /^\d{5,20}$/;
const TIKTOK_PIXEL_ID = /^[A-Z0-9]{8,32}$/;

export function validMetaPixelId(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return META_PIXEL_ID.test(v) ? v : null;
}

export function validTikTokPixelId(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return TIKTOK_PIXEL_ID.test(v) ? v : null;
}

/**
 * Pixel ids from NEXT_PUBLIC_FB_PIXEL_ID / NEXT_PUBLIC_TIKTOK_PIXEL_ID.
 * Pass `process.env` (or a test object). Invalid ids come back as null.
 */
export function readPixelConfig(source: Record<string, string | undefined>): PixelConfig {
  return {
    metaPixelId: validMetaPixelId(source.NEXT_PUBLIC_FB_PIXEL_ID),
    tiktokPixelId: validTikTokPixelId(source.NEXT_PUBLIC_TIKTOK_PIXEL_ID),
  };
}

/** window key of the pre-load event queue shared by track() and the pixel base code. */
export const PIXEL_QUEUE_KEY = "__skPixelQueue";
/** Events kept per pixel while its script has not run yet (oldest dropped first). */
export const PIXEL_QUEUE_LIMIT = 50;

export type PixelQueue = { meta?: unknown[][]; tiktok?: unknown[][] };

/**
 * Replays events that track() queued before the base code defined fbq/ttq.
 * `call` is a JS expression applied to each queued args array.
 */
function flushQueueCode(pixel: keyof PixelQueue, call: string): string {
  return (
    `(function(w){var s=w.${PIXEL_QUEUE_KEY},q=s&&s.${pixel};if(!q)return;s.${pixel}=[];` +
    `for(var i=0;i<q.length;i++){try{${call}}catch(e){}}})(window);`
  );
}

/**
 * Official Meta Pixel base code. `autoConfig` is turned off so the pixel does
 * not scrape button labels / form fields (player ids, phone numbers); we send
 * the standard events ourselves.
 */
export function metaPixelBaseCode(pixelId: string): string {
  const id = validMetaPixelId(pixelId);
  if (!id) throw new Error("Invalid Meta Pixel id");
  return (
    "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?" +
    "n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;" +
    "n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;" +
    "t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window," +
    "document,'script','https://connect.facebook.net/en_US/fbevents.js');" +
    `fbq('set','autoConfig',false,'${id}');fbq('init','${id}');fbq('track','PageView');` +
    flushQueueCode("meta", "w.fbq.apply(w,q[i])")
  );
}

/** Image beacon for visitors without JavaScript (PageView only). */
export function metaPixelNoscriptUrl(pixelId: string): string | null {
  const id = validMetaPixelId(pixelId);
  return id ? `https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1` : null;
}

/** Official TikTok Pixel base code. */
export function tiktokPixelBaseCode(pixelId: string): string {
  const id = validTikTokPixelId(pixelId);
  if (!id) throw new Error("Invalid TikTok Pixel id");
  return (
    "!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=" +
    '["page","track","identify","instances","debug","on","off","once","ready","alias",' +
    '"group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],' +
    "ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice" +
    ".call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq." +
    "methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;" +
    "n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r=" +
    '"https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},' +
    "ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{}," +
    'ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,' +
    'n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];' +
    `e.parentNode.insertBefore(n,e)};ttq.load('${id}');ttq.page();}(window,document,'ttq');` +
    flushQueueCode("tiktok", "w.ttq[q[i][0]].apply(w.ttq,q[i].slice(1))")
  );
}

/** TikTok uses different names for some standard events. */
export const TIKTOK_EVENT_NAMES: Record<TrackEvent, string> = {
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
  Contact: "Contact",
  Lead: "SubmitForm",
};

/** Dollars rounded to cents; null for missing / negative / non-finite values. */
function money(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

const text = (v: string | undefined, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/** Arguments for fbq(...): ['track', event, data, { eventID }?]. */
export function metaEventArgs(event: TrackEvent, params: TrackParams = {}): unknown[] {
  const data: Record<string, unknown> = {};
  const id = text(params.contentId, 100);
  const name = text(params.contentName, 200);
  if (id) {
    data.content_ids = [id];
    data.content_type = "product";
  }
  if (name) data.content_name = name;
  const value = money(params.value);
  if (value != null) {
    data.value = value;
    data.currency = params.currency ?? "USD";
  }
  const args: unknown[] = ["track", event, data];
  const eventId = text(params.orderCode, 64);
  if (eventId) args.push({ eventID: eventId });
  return args;
}

/** Arguments for ttq.track(...): ['track', name, data, { event_id }?]. */
export function tiktokEventArgs(event: TrackEvent, params: TrackParams = {}): unknown[] {
  const data: Record<string, unknown> = {};
  const id = text(params.contentId, 100);
  const name = text(params.contentName, 200);
  if (id || name) {
    const content: Record<string, unknown> = { content_type: "product", quantity: 1 };
    if (id) content.content_id = id;
    if (name) content.content_name = name;
    data.contents = [content];
  }
  const value = money(params.value);
  if (value != null) {
    data.value = value;
    data.currency = params.currency ?? "USD";
  }
  const args: unknown[] = ["track", TIKTOK_EVENT_NAMES[event], data];
  const eventId = text(params.orderCode, 64);
  if (eventId) args.push({ event_id: eventId });
  return args;
}

/** Pixels must never run on the admin panel (order ids, customer data, no audience value). */
export function isTrackablePath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  return !(pathname === "/admin" || pathname.startsWith("/admin/"));
}
