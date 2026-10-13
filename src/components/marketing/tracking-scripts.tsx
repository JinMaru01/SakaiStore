import { readPixelConfig } from "@/lib/tracking/pixels";
import { PixelScripts } from "./pixel-scripts";

/**
 * Injects Meta Pixel / TikTok Pixel base code when NEXT_PUBLIC_FB_PIXEL_ID /
 * NEXT_PUBLIC_TIKTOK_PIXEL_ID are set (and pass strict id validation).
 * Rendered once in the root layout; renders nothing when neither is set.
 */
export function TrackingScripts() {
  const { metaPixelId, tiktokPixelId } = readPixelConfig({
    NEXT_PUBLIC_FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
  });
  if (!metaPixelId && !tiktokPixelId) return null;
  return <PixelScripts metaPixelId={metaPixelId} tiktokPixelId={tiktokPixelId} />;
}
