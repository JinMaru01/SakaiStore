import { z } from "zod";
import { getGameBySlug, getPackageForGame } from "@/lib/catalog";
import { errorJson, json, rateLimitResponse, readJsonBody } from "@/lib/orders/http";
import { quotePromo } from "@/lib/orders/promos";

/**
 * POST /api/promo/validate — preview a promo code on the order form. Uses the
 * exact same rules as createOrder, so the shown total is what gets charged.
 */

const bodySchema = z.object({
  code: z.string().trim().max(64),
  gameSlug: z.string().trim().min(1).max(64),
  packageId: z.coerce.number().int().positive().max(2_147_483_647),
});

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "promo:validate", 30, 60_000, { ok: false });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return errorJson("invalid_request", 400, { ok: false });
  const { code, gameSlug, packageId } = parsed.data;
  if (!code) return errorJson("not_found", 400, { ok: false });

  try {
    const game = await getGameBySlug(gameSlug);
    const pkg = game ? await getPackageForGame(game.id, packageId) : null;
    if (!game || !pkg) return errorJson("not_applicable", 400, { ok: false });

    const quote = await quotePromo({ code, gameId: game.id, subtotalCents: pkg.priceCents });
    if (!quote.ok) return errorJson(quote.error, 400, { ok: false });

    return json({
      ok: true,
      code: quote.promo.code,
      description: quote.promo.description ?? null,
      discountCents: quote.discountCents,
      subtotalCents: quote.subtotalCents,
      totalCents: quote.totalCents,
    });
  } catch (err) {
    console.error("[api/promo/validate] failed", err);
    return errorJson("server_error", 500, { ok: false });
  }
}
