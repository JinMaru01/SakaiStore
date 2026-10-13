import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { packages as packagesTable, type Game, type Package } from "@/db/schema";
import { getGameBySlug, listGames, type GameWithMinPrice } from "@/lib/catalog";
import { findPromoByCode } from "@/lib/orders/promos";
import { minPrice } from "./packages";
import { isPromoLive, offerAppliesTo, offerConditions, offerHeadline, toPromoOffer, type PromoOffer } from "./promo-offer";

/** Data for promo images / OG images. Server-only. */

export type PosterGameData = {
  id: number;
  slug: string;
  name: string;
  currencyName: string;
  accentColor: string;
  minPriceCents: number | null;
  packages: Package[];
};

/**
 * One game for a promo image. Admins may prepare posts for a hidden game, so
 * inactive games are allowed — but only active packages are ever advertised.
 */
export async function loadPosterGame(slug: string): Promise<PosterGameData | null> {
  const game = await getGameBySlug(slug, { includeInactive: true });
  if (!game) return null;
  const active = game.packages.filter((p) => p.active);
  return toPosterGame(game, active);
}

function toPosterGame(game: Game, pkgs: Package[]): PosterGameData {
  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    currencyName: game.currencyName,
    accentColor: game.accentColor,
    minPriceCents: minPrice(pkgs),
    packages: pkgs,
  };
}

/**
 * Orderable games for the all-games poster: featured first, then the rest,
 * each in admin sort order, with their active packages (one query).
 */
export async function loadCatalogPosterGames(limit: number): Promise<PosterGameData[]> {
  const games = (await listGames()).filter((g) => g.packageCount > 0);
  const ordered = [...games.filter((g) => g.featured), ...games.filter((g) => !g.featured)].slice(0, limit);
  if (ordered.length === 0) return [];
  const rows = await db
    .select()
    .from(packagesTable)
    .where(and(inArray(packagesTable.gameId, ordered.map((g) => g.id)), eq(packagesTable.active, true)))
    .orderBy(asc(packagesTable.sortOrder), asc(packagesTable.priceCents), asc(packagesTable.id));
  const byGame = new Map<number, Package[]>();
  for (const row of rows) {
    const list = byGame.get(row.gameId) ?? [];
    list.push(row);
    byGame.set(row.gameId, list);
  }
  return ordered.map((g: GameWithMinPrice) => toPosterGame(g, byGame.get(g.id) ?? []));
}

/**
 * A promo code worth advertising right now on a post for `gameId` (null =
 * all games): it exists, is live, and is not restricted to another game.
 */
export async function loadLivePromo(
  code: string | null | undefined,
  gameId: number | null,
  now: Date = new Date(),
): Promise<PromoOffer | null> {
  if (!code?.trim()) return null;
  const promo = await findPromoByCode(code);
  if (!promo || !isPromoLive(promo, now)) return null;
  const offer = toPromoOffer(promo);
  return offerAppliesTo(offer, gameId) ? offer : null;
}

/** The poster callout for a live offer. */
export function posterPromo(offer: PromoOffer | null): { code: string; headline: string; conditions: string } | null {
  return offer ? { code: offer.code, headline: offerHeadline(offer), conditions: offerConditions(offer) } : null;
}
