import { z } from "zod";
import { getGameBySlug } from "@/lib/catalog";
import { errorJson, firstIssueField, json, rateLimitResponse, readJsonBody } from "@/lib/orders/http";
import { validatePlayer } from "@/lib/orders/validation";
import { lookupPlayer } from "@/lib/players/lookup";

/**
 * POST /api/players/lookup — validate a Player ID (+ Zone) for a game and
 * return the nickname when a lookup provider is configured, so customers
 * can confirm the account before paying.
 */

const asText = (v: unknown) => (typeof v === "number" ? String(v) : v);

const bodySchema = z.object({
  gameSlug: z.string().trim().min(1).max(64),
  playerId: z.preprocess(asText, z.string().trim().min(1).max(64)),
  zoneId: z.preprocess(asText, z.string().trim().max(32).nullish()),
});

const FIELD_ERRORS: Record<string, string> = {
  playerId: "invalid_id",
  zoneId: "invalid_zone",
  gameSlug: "game_not_found",
};

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "players:lookup", 30, 60_000, { ok: false });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    const field = firstIssueField(parsed.error);
    const error = (field && FIELD_ERRORS[field]) || "invalid_request";
    return errorJson(error, error === "game_not_found" ? 404 : 400, { ok: false, ...(field ? { field } : {}) });
  }
  const { gameSlug, playerId, zoneId } = parsed.data;

  try {
    const game = await getGameBySlug(gameSlug);
    if (!game) return errorJson("game_not_found", 404, { ok: false, field: "gameSlug" });

    const valid = validatePlayer(game, playerId, zoneId);
    if (!valid.ok) return errorJson(valid.error, 400, { ok: false, field: valid.field });

    const result = await lookupPlayer(game, valid.playerId, valid.zoneId);
    if (result.ok) {
      return json({ ok: true, playerName: result.playerName, playerId: valid.playerId, zoneId: valid.zoneId });
    }
    if (result.error === "not_found") return errorJson("not_found", 404, { ok: false, field: "playerId" });
    if (result.error === "invalid_id") return errorJson("invalid_id", 400, { ok: false, field: "playerId" });
    // Provider down: don't block checkout, just skip the nickname.
    console.warn(`[api/players/lookup] provider unavailable for ${game.slug}`);
    return json({ ok: true, playerName: null, playerId: valid.playerId, zoneId: valid.zoneId });
  } catch (err) {
    console.error("[api/players/lookup] failed", err);
    return errorJson("server_error", 500, { ok: false });
  }
}
