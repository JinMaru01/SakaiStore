"use client";

import { useEffect } from "react";
import { attributionCookieFor } from "@/lib/tracking/attribution-cookie";
import { isTrackablePath } from "@/lib/tracking/pixels";

/**
 * Captures marketing attribution (utm_*, fbclid/ttclid, external referrer)
 * into the `sk_attr` cookie — last non-direct touch wins, 30 days (see
 * src/lib/tracking/attribution-cookie.ts and docs/SOCIAL_MEDIA_PLAYBOOK.md).
 *
 * Rendered once in the root layout, so the effect runs once per full page
 * load: client-side navigations keep the original document.referrer and must
 * not be re-counted as touches. The owner's /admin visits are skipped so they
 * never get (or overwrite) an attribution cookie.
 */
export function AttributionCapture() {
  useEffect(() => {
    try {
      if (!isTrackablePath(window.location.pathname)) return;
      const cookie = attributionCookieFor({ href: window.location.href, referrer: document.referrer });
      if (cookie) document.cookie = cookie;
    } catch {
      // Attribution is best effort: never break the page (cookies may be blocked).
    }
  }, []);
  return null;
}
