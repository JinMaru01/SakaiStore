"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useRef } from "react";
import { trackPageView } from "@/lib/tracking/client";
import {
  isTrackablePath,
  metaPixelBaseCode,
  metaPixelNoscriptUrl,
  tiktokPixelBaseCode,
  validMetaPixelId,
  validTikTokPixelId,
} from "@/lib/tracking/pixels";

type Props = { metaPixelId: string | null; tiktokPixelId: string | null };

/**
 * Pixel base code (next/script, afterInteractive) + PageView on client-side
 * navigations. Ids are validated again here because they end up inside an
 * inline script. Never loads on /admin.
 */
export function PixelScripts({ metaPixelId, tiktokPixelId }: Props) {
  const pathname = usePathname();
  const meta = validMetaPixelId(metaPixelId);
  const tiktok = validTikTokPixelId(tiktokPixelId);
  if (!isTrackablePath(pathname) || (!meta && !tiktok)) return null;
  const noscript = meta ? metaPixelNoscriptUrl(meta) : null;

  return (
    <>
      {meta && (
        <Script id="sk-meta-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: metaPixelBaseCode(meta) }} />
      )}
      {noscript && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- 1x1 tracking beacon, not content */}
          <img height="1" width="1" alt="" style={{ display: "none" }} src={noscript} />
        </noscript>
      )}
      {tiktok && (
        <Script
          id="sk-tiktok-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: tiktokPixelBaseCode(tiktok) }}
        />
      )}
      {/* useSearchParams needs a Suspense boundary so it never forces client rendering of the page. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}

/** PageView on every client-side navigation (the base code already tracked the first page). */
function PageViewTracker() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const url = `${pathname}?${search}`;
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === null) {
      last.current = url;
      return;
    }
    if (last.current === url) return;
    last.current = url;
    if (isTrackablePath(pathname)) trackPageView();
  }, [url, pathname]);

  return null;
}
