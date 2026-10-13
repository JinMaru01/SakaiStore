"use client";

import {
  metaEventArgs,
  PIXEL_QUEUE_KEY,
  PIXEL_QUEUE_LIMIT,
  tiktokEventArgs,
  type PixelQueue,
  type TrackEvent,
  type TrackParams,
} from "./pixels";

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
 * Pixels are injected by src/components/marketing/tracking-scripts.tsx with
 * next/script (afterInteractive), which runs AFTER the page's own effects on
 * first load. Events fired before that are queued on window and replayed by
 * the pixel base code (see flushQueueCode in ./pixels.ts), so a ViewContent
 * fired on mount is never lost. Mapping: Purchase → TikTok "CompletePayment".
 */
export type { TrackEvent, TrackParams } from "./pixels";

type FbqFn = (...args: unknown[]) => void;
type Ttq = { track?: (...args: unknown[]) => void } & Record<string, unknown>;
type PixelWindow = Window & { fbq?: FbqFn; ttq?: Ttq; [PIXEL_QUEUE_KEY]?: PixelQueue };

function enqueue(w: PixelWindow, pixel: keyof PixelQueue, args: unknown[]) {
  const queue = (w[PIXEL_QUEUE_KEY] ??= {});
  const list = (queue[pixel] ??= []);
  list.push(args);
  // Pixel not configured on this deployment: keep memory bounded.
  if (list.length > PIXEL_QUEUE_LIMIT) list.splice(0, list.length - PIXEL_QUEUE_LIMIT);
}

export function track(event: TrackEvent, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;
  const w = window as PixelWindow;
  try {
    const meta = metaEventArgs(event, params);
    if (typeof w.fbq === "function") w.fbq(...meta);
    else enqueue(w, "meta", meta);

    const [method, ...rest] = tiktokEventArgs(event, params) as [string, ...unknown[]];
    const ttqTrack = w.ttq?.track;
    if (typeof ttqTrack === "function") ttqTrack.apply(w.ttq, rest);
    else enqueue(w, "tiktok", [method, ...rest]);
  } catch {
    // Tracking must never break checkout.
  }
  if (process.env.NODE_ENV !== "production") console.debug("[track]", event, params);
}

/** PageView for client-side (SPA) navigations; the base code tracks the first one. */
export function trackPageView(): void {
  if (typeof window === "undefined") return;
  const w = window as PixelWindow;
  try {
    if (typeof w.fbq === "function") w.fbq("track", "PageView");
    const page = w.ttq?.page;
    if (typeof page === "function") (page as () => void).call(w.ttq);
  } catch {
    // ignore
  }
}
