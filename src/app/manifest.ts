import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

/**
 * /manifest.webmanifest — "Add to Home screen" for repeat customers.
 * start_url carries no UTM tags on purpose: a home-screen launch is a direct
 * visit and must not overwrite the Facebook/TikTok attribution cookie.
 */

// Store name comes from settings (DB): never prerender at build time.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { store } = await getSettings();
  return {
    id: "/",
    name: store.name,
    short_name: store.name.length > 12 ? store.name.split(/\s+/)[0]!.slice(0, 12) : store.name,
    description: store.tagline.en,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0d18",
    theme_color: "#0a0d18",
    lang: "en",
    categories: ["shopping", "games"],
    // PNGs for Android launchers (SVG manifest icons are not supported everywhere);
    // the maskable variant keeps the gem inside the 80% safe zone.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
