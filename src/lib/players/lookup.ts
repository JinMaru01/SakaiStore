import "server-only";
import { createHash } from "node:crypto";
import type { Game } from "@/db/schema";
import { env } from "@/lib/env";
import { validatePlayer, type PlayerGameRules } from "@/lib/orders/validation";

/**
 * Player nickname lookup ("Is this your account? ✔ ShadowFox_42"). Shown on
 * the order form so customers catch a mistyped ID before paying.
 *
 * PLAYER_LOOKUP_MODE:
 *  - none: validate the ID format only; playerName is always null.
 *  - mock: deterministic fake nickname derived from the ID, for demos/tests.
 *          Test hook (mock mode only): IDs ending in "000" return not_found.
 *
 * A real provider (game API / supplier API) plugs in as another mode: it must
 * return "unavailable" (never throw) when the upstream is down so checkout
 * keeps working.
 */

export type PlayerLookupError = "invalid_id" | "not_found" | "unavailable";
export type PlayerLookupResult =
  | { ok: true; playerName: string | null }
  | { ok: false; error: PlayerLookupError };

export type LookupGame = PlayerGameRules & Pick<Game, "slug">;

const ADJECTIVES = [
  "Shadow", "Crimson", "Silent", "Golden", "Frost", "Thunder", "Lucky", "Savage",
  "Mystic", "Royal", "Neon", "Iron", "Swift", "Wild", "Cosmic", "Blazing",
];
const NOUNS = [
  "Fox", "Tiger", "Dragon", "Ninja", "Phoenix", "Wolf", "Ranger", "Knight",
  "Hunter", "Samurai", "Cobra", "Falcon", "Panda", "Reaper", "Titan", "Sniper",
];

/** Deterministic nickname for an id: same id → same name, different ids spread out. */
export function mockNickname(playerId: string): string {
  const h = createHash("sha256").update(playerId).digest();
  return `${ADJECTIVES[h[0]! % ADJECTIVES.length]}${NOUNS[h[1]! % NOUNS.length]}_${h.readUInt16BE(2) % 100}`;
}

export async function lookupPlayer(
  game: LookupGame,
  playerId: string,
  zoneId?: string | null,
): Promise<PlayerLookupResult> {
  const valid = validatePlayer(game, playerId, zoneId);
  if (!valid.ok) return { ok: false, error: "invalid_id" };

  const mode = env().PLAYER_LOOKUP_MODE;
  switch (mode) {
    case "none":
      return { ok: true, playerName: null };
    case "mock":
      if (valid.playerId.endsWith("000")) return { ok: false, error: "not_found" };
      return { ok: true, playerName: mockNickname(valid.playerId) };
    default: {
      const unknown: never = mode;
      console.error(`[players] unknown PLAYER_LOOKUP_MODE: ${String(unknown)}`);
      return { ok: false, error: "unavailable" };
    }
  }
}
