import "server-only";
import { and, asc, eq, getTableColumns, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { games, packages, type Game, type Package } from "@/db/schema";

/**
 * Read-side catalog queries (games + packages) shared by the storefront,
 * order service and admin. Storefront callers use the defaults (active only);
 * the admin passes `includeInactive` to see hidden games/packages too.
 */

export type GameWithMinPrice = Game & {
  /** Cheapest active package in cents ("from $x"), null when the game has none. */
  minPriceCents: number | null;
  /** Number of active packages. */
  packageCount: number;
};

export type GameWithPackages = Game & { packages: Package[] };

type CatalogOpts = { includeInactive?: boolean };

const PG_INT_MAX = 2_147_483_647;

/** All games sorted by sortOrder (then name), with "from" price and package count. */
export async function listGames(opts: CatalogOpts = {}): Promise<GameWithMinPrice[]> {
  const rows = await db
    .select({
      ...getTableColumns(games),
      minPriceCents: sql<number | null>`min(${packages.priceCents})`.mapWith(Number),
      packageCount: sql<number>`count(${packages.id})`.mapWith(Number),
    })
    .from(games)
    // Only active packages count towards the price/package count.
    .leftJoin(packages, and(eq(packages.gameId, games.id), eq(packages.active, true)))
    .where(opts.includeInactive ? undefined : eq(games.active, true))
    .groupBy(games.id)
    .orderBy(asc(games.sortOrder), asc(games.name));
  return rows;
}

/** One game by slug with its packages sorted by sortOrder, then price. */
export async function getGameBySlug(
  slug: string,
  opts: CatalogOpts = {},
): Promise<GameWithPackages | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.length > 64) return null;
  const conditions: SQL[] = [eq(games.slug, normalized)];
  if (!opts.includeInactive) conditions.push(eq(games.active, true));
  const [game] = await db
    .select()
    .from(games)
    .where(and(...conditions))
    .limit(1);
  if (!game) return null;
  return { ...game, packages: await listPackages(game.id, opts) };
}

async function listPackages(gameId: number, opts: CatalogOpts): Promise<Package[]> {
  const conditions: SQL[] = [eq(packages.gameId, gameId)];
  if (!opts.includeInactive) conditions.push(eq(packages.active, true));
  return db
    .select()
    .from(packages)
    .where(and(...conditions))
    .orderBy(asc(packages.sortOrder), asc(packages.priceCents), asc(packages.id));
}

/**
 * A package that belongs to the given game (active only unless
 * `includeInactive`). Returns null for a package id from another game, so a
 * tampered request can never buy game B's package under game A.
 */
export async function getPackageForGame(
  gameId: number,
  packageId: number,
  opts: CatalogOpts = {},
): Promise<Package | null> {
  // Out-of-range ids would make Postgres throw ("out of range for type integer").
  if (!Number.isInteger(packageId) || packageId <= 0 || packageId > PG_INT_MAX) return null;
  const conditions: SQL[] = [eq(packages.id, packageId), eq(packages.gameId, gameId)];
  if (!opts.includeInactive) conditions.push(eq(packages.active, true));
  const [pkg] = await db
    .select()
    .from(packages)
    .where(and(...conditions))
    .limit(1);
  return pkg ?? null;
}
