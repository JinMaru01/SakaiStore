import { OG_SIZE, SiteOgCard, type OgTileGame } from "@/components/marketing/og/cards";
import { PUBLIC_IMAGE_CACHE, renderPng } from "@/components/marketing/og/render";
import { listGames } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";
import { displayHost } from "@/lib/marketing/og-text";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";

/*
 * Site-wide link preview (Facebook, Messenger, Telegram, TikTok bio…): store
 * name, English tagline, a row of game tiles and the KHQR promise. Game pages
 * override it with their own image (games/[slug]/opengraph-image.tsx).
 *
 * There is deliberately no root twitter-image: Next fills twitter:image from
 * og:image when a page has none, so game pages keep their game image there too.
 */

// Reads the catalog: never prerender at build time.
export const dynamic = "force-dynamic";

export const alt = "Game top-up in Cambodia — pay with KHQR, instant delivery";
export const size = OG_SIZE;
export const contentType = "image/png";

type CardData = { storeName: string; tagline: string; games: OgTileGame[]; cache: string };

async function loadCard(): Promise<CardData> {
  try {
    const [{ store }, games] = await Promise.all([getSettings(), listGames()]);
    const orderable = games.filter((g) => g.packageCount > 0);
    const tiles = [...orderable.filter((g) => g.featured), ...orderable.filter((g) => !g.featured)].slice(0, 6);
    return { storeName: store.name, tagline: store.tagline.en, games: tiles, cache: PUBLIC_IMAGE_CACHE };
  } catch (err) {
    // A broken preview is worse than a generic one: fall back to defaults without the DB (short cache).
    console.error("[og] site image data failed, using defaults", err);
    const { store } = DEFAULT_SETTINGS;
    return { storeName: store.name, tagline: store.tagline.en, games: [], cache: "public, max-age=60" };
  }
}

export default async function Image() {
  const { cache, ...card } = await loadCard();
  return renderPng(<SiteOgCard {...card} host={displayHost(siteUrl())} />, {
    ...size,
    headers: { "cache-control": cache },
  });
}
