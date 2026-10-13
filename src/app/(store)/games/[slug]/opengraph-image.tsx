import { GameOgCard, OG_SIZE, SiteOgCard, type OgGame } from "@/components/marketing/og/cards";
import { PUBLIC_IMAGE_CACHE, renderPng } from "@/components/marketing/og/render";
import { getGameBySlug } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";
import { minPrice, pickHighlightPackages, type PromoPackage } from "@/lib/marketing/packages";
import { displayHost } from "@/lib/marketing/og-text";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";

/*
 * Link preview for a game page: the generated tile in the game's accent
 * color, its name, "from $x" and the best packages — what people see when a
 * game link is shared on Facebook, Messenger or Telegram.
 */

// Live prices: never prerender at build time.
export const dynamic = "force-dynamic";

export const alt = "Game top-up prices — pay with KHQR, instant delivery";
export const size = OG_SIZE;
export const contentType = "image/png";

type CardData =
  | { kind: "game"; storeName: string; game: OgGame; minPriceCents: number | null; packages: PromoPackage[]; cache: string }
  | { kind: "site"; storeName: string; tagline: string; cache: string };

async function loadCard(slug: string): Promise<CardData> {
  try {
    const [game, { store }] = await Promise.all([getGameBySlug(slug), getSettings()]);
    if (!game) return { kind: "site", storeName: store.name, tagline: store.tagline.en, cache: "public, max-age=300" };
    return {
      kind: "game",
      storeName: store.name,
      game,
      minPriceCents: minPrice(game.packages),
      packages: pickHighlightPackages(game.packages, 4),
      cache: PUBLIC_IMAGE_CACHE,
    };
  } catch (err) {
    console.error(`[og] game image data failed for ${slug}, using defaults`, err);
    const { store } = DEFAULT_SETTINGS;
    return { kind: "site", storeName: store.name, tagline: store.tagline.en, cache: "public, max-age=60" };
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await loadCard(slug);
  const host = displayHost(siteUrl());
  const element =
    card.kind === "game" ? (
      <GameOgCard
        game={card.game}
        minPriceCents={card.minPriceCents}
        packages={card.packages}
        storeName={card.storeName}
        host={host}
      />
    ) : (
      <SiteOgCard storeName={card.storeName} tagline={card.tagline} games={[]} host={host} />
    );
  return renderPng(element, { ...size, headers: { "cache-control": card.cache } });
}
