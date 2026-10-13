"use client";

/**
 * Client-side marketing event tracking (Meta Pixel + TikTok Pixel).
 * Safe to call anywhere on the client: no-ops when pixels are not configured.
 *
 * Standard events used by the storefront:
 *   ViewContent      – game page viewed            { contentId: slug, contentName, value? }
 *   AddToCart        – package selected            { contentId: `${slug}:${packageId}`, contentName, value }
 *   InitiateCheckout – order created, KHQR shown   { contentId, contentName, value, orderCode }
 *   Purchase         – order paid                  { contentId, contentName, value, orderCode }
 * `value` is in USD (dollars, not cents). `orderCode` is used as event id for dedupe.
 *
 * Implemented by the marketing module (pixels are injected by
 * src/components/marketing/tracking-scripts.tsx).
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

export function track(event: TrackEvent, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") console.debug("[track]", event, params);
}
