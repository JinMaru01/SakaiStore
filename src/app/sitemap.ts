import type { MetadataRoute } from "next";
import { listGames, type GameWithMinPrice } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";

/**
 * /sitemap.xml — home, every active game page and the public info pages,
 * with absolute URLs from NEXT_PUBLIC_SITE_URL. Order pages and the admin are
 * private and never listed (see robots.ts).
 */

// Reads the catalog and the runtime site URL: never prerender at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  let games: GameWithMinPrice[] = [];
  try {
    games = await listGames();
  } catch (err) {
    // Still serve the static pages if the database is briefly unavailable.
    console.error("[sitemap] failed to list games", err);
  }
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...games.map((g) => ({
      url: `${base}/games/${encodeURIComponent(g.slug)}`,
      lastModified: g.updatedAt,
      changeFrequency: "daily" as const,
      priority: g.featured ? 0.9 : 0.8,
    })),
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/track`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
