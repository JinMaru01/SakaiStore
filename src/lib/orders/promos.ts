import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { promoCodes, type PromoCode } from "@/db/schema";
import { evaluatePromo, normalizePromoCode, type PromoError } from "./pricing";

/** Promo code lookups shared by POST /api/promo/validate and createOrder. */

const MAX_PROMO_CODE_LENGTH = 32;

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

export type PromoQuote =
  | {
      ok: true;
      promo: PromoCode;
      discountCents: number;
      subtotalCents: number;
      totalCents: number;
    }
  | { ok: false; error: PromoError };

/** Look up + evaluate a code for an order of `subtotalCents` on `gameId`. */
export async function quotePromo(input: {
  code: string;
  gameId: number;
  subtotalCents: number;
  now?: Date;
}): Promise<PromoQuote> {
  const promo = await findPromoByCode(input.code);
  const result = evaluatePromo(promo, {
    subtotalCents: input.subtotalCents,
    gameId: input.gameId,
    now: input.now,
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
