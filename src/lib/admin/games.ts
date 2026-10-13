import "server-only";
import { and, asc, count, eq, getTableColumns, inArray, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, packages, promoCodes, type Game, type Package } from "@/db/schema";
import type { GameData, PackageData } from "./game-schema";

/** Admin catalog writes (games + packages). Reads for the storefront live in @/lib/catalog. */

export type AdminGameRow = Game & {
  packageCount: number;
  activePackageCount: number;
  /** Cheapest ACTIVE package (what the storefront shows as "from $x"). */
  minPriceCents: number | null;
};

export async function listAdminGames(): Promise<AdminGameRow[]> {
  return db
    .select({
      ...getTableColumns(games),
      packageCount: sql<number>`count(${packages.id})`.mapWith(Number),
      activePackageCount: sql<number>`count(${packages.id}) filter (where ${packages.active})`.mapWith(Number),
      minPriceCents: sql<number | null>`min(${packages.priceCents}) filter (where ${packages.active})`.mapWith(
        (v) => (v == null ? null : Number(v)),
      ),
    })
    .from(games)
    .leftJoin(packages, eq(packages.gameId, games.id))
    .groupBy(games.id)
    .orderBy(asc(games.sortOrder), asc(games.name), asc(games.id));
}

const PG_INT_MAX = 2_147_483_647;
export const isDbId = (id: unknown): id is number =>
  typeof id === "number" && Number.isInteger(id) && id > 0 && id <= PG_INT_MAX;

/** A game with ALL its packages (inactive included), in editor order. */
export async function getAdminGame(id: number): Promise<(Game & { packages: Package[] }) | null> {
  if (!isDbId(id)) return null;
  const [game] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  if (!game) return null;
  const pkgs = await db
    .select()
    .from(packages)
    .where(eq(packages.gameId, id))
    .orderBy(asc(packages.sortOrder), asc(packages.priceCents), asc(packages.id));
  return { ...game, packages: pkgs };
}

export async function isSlugTaken(slug: string, exceptId?: number | null): Promise<boolean> {
  const [row] = await db
    .select({ id: games.id })
    .from(games)
    .where(exceptId ? and(eq(games.slug, slug), ne(games.id, exceptId)) : eq(games.slug, slug))
    .limit(1);
  return !!row;
}

export class StalePackagesError extends Error {
  constructor() {
    super("stale_packages");
    this.name = "StalePackagesError";
  }
}

/**
 * Create or update a game and replace its package list in one transaction.
 * Packages keep their ids (orders reference them); ids not in `pkgs` are
 * deleted, new ones inserted, and sortOrder follows the list order. Throws
 * StalePackagesError when an id does not belong to this game (deleted in
 * another tab, or a tampered request). Returns the game id, or null when
 * the game to update no longer exists.
 */
export async function saveGame(id: number | null, game: GameData, pkgs: PackageData[]): Promise<number | null> {
  return db.transaction(async (tx) => {
    let gameId: number;
    if (id == null) {
      const [row] = await tx.insert(games).values(game).returning({ id: games.id });
      gameId = row!.id;
    } else {
      const [row] = await tx.update(games).set(game).where(eq(games.id, id)).returning({ id: games.id });
      if (!row) return null;
      gameId = row.id;
    }

    const keepIds = pkgs.flatMap((p) => (p.id != null ? [p.id] : []));
    if (keepIds.length) {
      const owned = await tx
        .select({ id: packages.id })
        .from(packages)
        .where(and(eq(packages.gameId, gameId), inArray(packages.id, keepIds)));
      if (owned.length !== keepIds.length) throw new StalePackagesError();
    }
    await tx
      .delete(packages)
      .where(keepIds.length ? and(eq(packages.gameId, gameId), notInArray(packages.id, keepIds)) : eq(packages.gameId, gameId));

    for (const [index, p] of pkgs.entries()) {
      const values = {
        name: p.name,
        amount: p.amount,
        bonus: p.bonus,
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents,
        badge: p.badge,
        supplierSku: p.supplierSku,
        active: p.active,
        sortOrder: index,
      };
      if (p.id != null) {
        await tx.update(packages).set(values).where(and(eq(packages.id, p.id), eq(packages.gameId, gameId)));
      } else {
        await tx.insert(packages).values({ ...values, gameId });
      }
    }
    return gameId;
  });
}

export async function countPromosForGame(gameId: number): Promise<number> {
  if (!isDbId(gameId)) return 0;
  const [row] = await db.select({ n: count() }).from(promoCodes).where(eq(promoCodes.gameId, gameId));
  return row?.n ?? 0;
}

/**
 * Delete a game and its packages. Orders keep their snapshot (game_id is set
 * null). Promo codes restricted to the game are DEACTIVATED first: the FK
 * would otherwise null their game_id and silently turn a one-game code into
 * an all-games code. Returns false when the game was already gone.
 */
export async function deleteGame(gameId: number): Promise<{ deleted: boolean; deactivatedPromos: number }> {
  if (!isDbId(gameId)) return { deleted: false, deactivatedPromos: 0 };
  return db.transaction(async (tx) => {
    const promos = await tx
      .update(promoCodes)
      .set({ active: false, gameId: null })
      .where(eq(promoCodes.gameId, gameId))
      .returning({ id: promoCodes.id });
    const deleted = await tx.delete(games).where(eq(games.id, gameId)).returning({ id: games.id });
    return { deleted: deleted.length > 0, deactivatedPromos: promos.length };
  });
}

export async function setGameFlag(gameId: number, flag: "active" | "featured", value: boolean): Promise<boolean> {
  if (!isDbId(gameId)) return false;
  const rows = await db
    .update(games)
    .set(flag === "active" ? { active: value } : { featured: value })
    .where(eq(games.id, gameId))
    .returning({ id: games.id });
  return rows.length > 0;
}

/** Swap a game with its neighbour in the list and renumber sortOrder 1..n (keeps ties from sticking). */
export async function moveGame(gameId: number, direction: "up" | "down"): Promise<boolean> {
  if (!isDbId(gameId)) return false;
  return db.transaction(async (tx) => {
    const list = await tx
      .select({ id: games.id, sortOrder: games.sortOrder })
      .from(games)
      .orderBy(asc(games.sortOrder), asc(games.name), asc(games.id))
      .for("update");
    const i = list.findIndex((g) => g.id === gameId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= list.length) return false;
    [list[i], list[j]] = [list[j]!, list[i]!];
    for (const [index, g] of list.entries()) {
      if (g.sortOrder !== index + 1) await tx.update(games).set({ sortOrder: index + 1 }).where(eq(games.id, g.id));
    }
    return true;
  });
}
