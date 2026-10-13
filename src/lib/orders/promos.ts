import "server-only";
import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db, type Database } from "@/db";
import { orders, promoCodes, type PromoCode } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { evaluatePromo, normalizePromoCode, type PromoError, type PromoEvaluation } from "./pricing";
import { PAID_STATUSES } from "./status";

/**
 * Promo code lookups shared by POST /api/promo/validate and createOrder.
 *
 * Usage limits (maxUses) count `usedCount` (orders that were PAID) plus the
 * uses *reserved* by orders still awaiting payment: pending_payment orders
 * whose KHQR has not expired. An expired, cancelled or stale order releases
 * its reservation automatically, so no counter has to be decremented.
 * createOrder evaluates this inside its insert transaction with the promo row
 * locked (lockPromoForOrder), so concurrent checkouts cannot both take the
 * last use.
 */

const MAX_PROMO_CODE_LENGTH = 32;

/** `db` or a transaction. */
type DbExecutor = Pick<Database, "select">;

/** A player's account in one game: the firstOrderOnly rule is per game + player id + zone. */
export type PromoPlayer = { playerId: string; zoneId: string | null };

/** Case-insensitive lookup (codes are stored UPPERCASE; upper() also covers legacy rows). */
export async function findPromoByCode(code: string | null | undefined): Promise<PromoCode | null> {
  const normalized = normalizePromoCode(code);
  if (!normalized || normalized.length > MAX_PROMO_CODE_LENGTH) return null;
  const [row] = await db
    .select()
    .from(promoCodes)
    .where(sql`upper(${promoCodes.code}) = ${normalized}`)
    .limit(1);
  return row ?? null;
}

/** Re-read a promo row with FOR UPDATE inside a transaction (serializes checkouts using the same code). */
export async function lockPromoForOrder(tx: DbExecutor, promoId: number): Promise<PromoCode | null> {
  const [row] = await tx.select().from(promoCodes).where(eq(promoCodes.id, promoId)).for("update");
  return row ?? null;
}

/** Uses held by orders awaiting payment: pending_payment with an unexpired KHQR. */
export async function countPromoReservations(promoId: number, now: Date, executor: DbExecutor = db): Promise<number> {
  const [row] = await executor
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .where(
      and(eq(orders.promoCodeId, promoId), eq(orders.status, "pending_payment"), gt(orders.paymentExpiresAt, now)),
    );
  return row?.n ?? 0;
}

/**
 * True when this player already has an order for the game that was paid
 * (any PAID_STATUSES) or is awaiting payment with an unexpired KHQR — so
 * several unpaid orders opened in parallel cannot each claim a "first order"
 * discount.
 */
export async function hasPriorOrder(
  p: PromoPlayer & { gameId: number; now: Date },
  executor: DbExecutor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.gameId, p.gameId),
        eq(orders.playerId, p.playerId),
        p.zoneId == null ? isNull(orders.zoneId) : eq(orders.zoneId, p.zoneId),
        or(
          inArray(orders.status, [...PAID_STATUSES]),
          and(eq(orders.status, "pending_payment"), gt(orders.paymentExpiresAt, p.now)),
        ),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * The full promo check for an order: the pure rules (evaluatePromo) plus the
 * ones that need the database — uses reserved by pending orders and, when
 * `player` is given, firstOrderOnly. Cheap rules run first, so a code that
 * fails anyway costs no extra queries.
 */
export async function evaluatePromoForOrder(
  promo: PromoCode | null,
  ctx: { subtotalCents: number; gameId: number; now: Date; player?: PromoPlayer | null },
  executor: DbExecutor = db,
): Promise<PromoEvaluation> {
  const base = { subtotalCents: ctx.subtotalCents, gameId: ctx.gameId, now: ctx.now };
  const quick = evaluatePromo(promo, base);
  if (!quick.ok || !promo) return quick;
  const [reservedUses, prior] = await Promise.all([
    promo.maxUses != null ? countPromoReservations(promo.id, ctx.now, executor) : 0,
    promo.firstOrderOnly && ctx.player
      ? hasPriorOrder({ ...ctx.player, gameId: ctx.gameId, now: ctx.now }, executor)
      : undefined,
  ]);
  return evaluatePromo(promo, { ...base, reservedUses, hasPriorOrder: prior });
}

/** Customer-facing promo description: Khmer when the locale is km and a Khmer text exists. */
export function promoDescription(promo: Pick<PromoCode, "description" | "descriptionKm">, locale: Locale): string | null {
  const km = promo.descriptionKm?.trim();
  if (locale === "km" && km) return km;
  return promo.description?.trim() || null;
}

export type PromoQuote =
  | {
      ok: true;
      promo: PromoCode;
      discountCents: number;
      subtotalCents: number;
      totalCents: number;
    }
  | { ok: false; error: PromoError; minOrderCents?: number };

/**
 * Look up + evaluate a code for an order of `subtotalCents` on `gameId`, with
 * the same rules createOrder applies (including reserved uses). firstOrderOnly
 * is checked only when `player` is given.
 */
export async function quotePromo(input: {
  code: string;
  gameId: number;
  subtotalCents: number;
  now?: Date;
  player?: PromoPlayer | null;
}): Promise<PromoQuote> {
  const promo = await findPromoByCode(input.code);
  const result = await evaluatePromoForOrder(promo, {
    subtotalCents: input.subtotalCents,
    gameId: input.gameId,
    now: input.now ?? new Date(),
    player: input.player,
  });
  if (!result.ok) return result;
  return {
    ok: true,
    promo: promo!,
    discountCents: result.discountCents,
    subtotalCents: input.subtotalCents,
    totalCents: input.subtotalCents - result.discountCents,
  };
}
