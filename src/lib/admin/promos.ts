import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { games, promoCodes, type PromoCode } from "@/db/schema";
import type { PromoData } from "./promo-schema";
import { isDbId } from "./games";

/** Admin CRUD for promo codes. Customer-side lookup/evaluation lives in @/lib/orders/promos. */

export type AdminPromoRow = PromoCode & { gameName: string | null };

export async function listAdminPromos(): Promise<AdminPromoRow[]> {
  const rows = await db
    .select({ promo: promoCodes, gameName: games.name })
    .from(promoCodes)
    .leftJoin(games, eq(games.id, promoCodes.gameId))
    .orderBy(desc(promoCodes.active), asc(promoCodes.code));
  return rows.map((r) => ({ ...r.promo, gameName: r.gameName }));
}

export async function getAdminPromo(id: number): Promise<PromoCode | null> {
  if (!isDbId(id)) return null;
  const [row] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
  return row ?? null;
}

export async function gameExists(id: number): Promise<boolean> {
  if (!isDbId(id)) return false;
  const [row] = await db.select({ id: games.id }).from(games).where(eq(games.id, id)).limit(1);
  return !!row;
}

/** Throws a unique violation (23505) when the code exists; callers map it to a field error. */
export async function createPromo(data: PromoData): Promise<number> {
  const [row] = await db.insert(promoCodes).values(data).returning({ id: promoCodes.id });
  return row!.id;
}

/** usedCount is never written here: it only moves when orders are paid. */
export async function updatePromo(id: number, data: PromoData): Promise<boolean> {
  if (!isDbId(id)) return false;
  const rows = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning({ id: promoCodes.id });
  return rows.length > 0;
}

/** Orders keep the code as text (promo_code), so history survives deletion. */
export async function deletePromo(id: number): Promise<boolean> {
  if (!isDbId(id)) return false;
  const rows = await db.delete(promoCodes).where(eq(promoCodes.id, id)).returning({ id: promoCodes.id });
  return rows.length > 0;
}

export async function setPromoActive(id: number, active: boolean): Promise<boolean> {
  if (!isDbId(id)) return false;
  const rows = await db.update(promoCodes).set({ active }).where(eq(promoCodes.id, id)).returning({ id: promoCodes.id });
  return rows.length > 0;
}

export async function listGameChoices(): Promise<{ id: number; name: string; active: boolean }[]> {
  return db
    .select({ id: games.id, name: games.name, active: games.active })
    .from(games)
    .orderBy(asc(games.sortOrder), asc(games.name));
}
