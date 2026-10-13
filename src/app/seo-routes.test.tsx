import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { games } from "@/db/schema";
import { resetDb, seedCatalog } from "../../tests/helpers/db";
import GameOgImage, { size as gameOgSize } from "./(store)/games/[slug]/opengraph-image";
import manifest from "./manifest";
import SiteOgImage, { alt, contentType, size } from "./opengraph-image";
import robots from "./robots";
import sitemap from "./sitemap";

/* Metadata routes: sitemap.xml, robots.txt, manifest and the Open Graph images. */

const SITE = "http://localhost:3000"; // NEXT_PUBLIC_SITE_URL in vitest.config.ts

async function pngSize(res: Response) {
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  const view = new DataView(bytes.buffer);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

beforeAll(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
  // A hidden game must not be listed.
  await db.update(games).set({ active: false }).where(eq(games.slug, "blood-strike"));
});

describe("sitemap", () => {
  it("lists home, every active game and the info pages with absolute URLs", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls[0]).toBe(`${SITE}/`);
    expect(urls).toContain(`${SITE}/games/mobile-legends`);
    expect(urls).toContain(`${SITE}/games/magic-chess-go-go`);
    expect(urls).not.toContain(`${SITE}/games/blood-strike`);
    for (const page of ["faq", "track", "terms", "privacy"]) expect(urls).toContain(`${SITE}/${page}`);
    expect(urls.every((u) => u.startsWith(`${SITE}/`))).toBe(true);
    expect(urls.some((u) => u.includes("/admin") || u.includes("/orders"))).toBe(false);
  });
});

describe("robots", () => {
  it("blocks admin, api and order pages and links the sitemap", () => {
    expect(robots()).toEqual({
      rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/orders"] }],
      sitemap: `${SITE}/sitemap.xml`,
      host: SITE,
    });
  });
});

describe("manifest", () => {
  it("names the store, uses the dark theme and the svg + png icons, without UTM tags", async () => {
    const m = await manifest();
    expect(m).toMatchObject({
      name: "Sakai Store",
      short_name: "Sakai Store",
      start_url: "/",
      display: "standalone",
      theme_color: "#0a0d18",
      background_color: "#0a0d18",
      icons: [
        { src: "/icon.svg", type: "image/svg+xml" },
        { src: "/icons/icon-192.png", sizes: "192x192" },
        { src: "/icons/icon-512.png", sizes: "512x512" },
        { src: "/icons/maskable-512.png", purpose: "maskable" },
      ],
    });
  });
});

describe("Open Graph images", () => {
  it("site image: 1200×630 PNG, cacheable", { timeout: 30_000 }, async () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    expect(alt).toMatch(/KHQR/);
    const res = await SiteOgImage();
    expect(res.headers.get("cache-control")).toMatch(/^public/);
    expect(await pngSize(res)).toEqual(size);
  });

  it("game image, and a generic fallback for an unknown game", { timeout: 30_000 }, async () => {
    const res = await GameOgImage({ params: Promise.resolve({ slug: "free-fire" }) });
    expect(res.headers.get("cache-control")).toMatch(/s-maxage/);
    expect(await pngSize(res)).toEqual(gameOgSize);

    const missing = await GameOgImage({ params: Promise.resolve({ slug: "does-not-exist" }) });
    expect(missing.status).toBe(200);
    expect(await pngSize(missing)).toEqual(gameOgSize);
  });
});
