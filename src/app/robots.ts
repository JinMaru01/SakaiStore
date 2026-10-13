import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * /robots.txt — keep crawlers out of the admin, the API and customers'
 * order pages (each order URL holds a player id). Link-preview images
 * (/opengraph-image, /games/<slug>/opengraph-image) stay crawlable.
 */

// The sitemap URL comes from the runtime NEXT_PUBLIC_SITE_URL.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/orders"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
