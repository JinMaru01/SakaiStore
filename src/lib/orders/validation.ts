import type { Game } from "@/db/schema";

/**
 * Player ID / Zone validation shared by the order service, the player lookup
 * and the public API. Patterns come from the DB (editable in /admin/games), so
 * they are treated as untrusted: compiled defensively, anchored, cached, and
 * only ever run against short inputs.
 */

/** Hard cap matching the `orders.player_id` column; also bounds regex work. */
export const MAX_PLAYER_ID_LENGTH = 64;
/** Matches the `orders.zone_id` column. */
export const MAX_ZONE_ID_LENGTH = 32;
const MAX_PATTERN_LENGTH = 160;

/** Used when a game has no idPattern (or an unusable one): letters, digits and common separators. */
const DEFAULT_ID_RE = /^[\p{L}\p{N}._#@-]{2,64}$/u;
const DEFAULT_ZONE_RE = /^[\p{L}\p{N}._-]{1,32}$/u;

export type PlayerGameRules = Pick<
  Game,
  "idPattern" | "requiresZone" | "zonePattern" | "zoneOptions"
>;

export type PlayerValidationResult =
  | { ok: true; playerId: string; zoneId: string | null }
  | { ok: false; error: "invalid_id" | "invalid_zone"; field: "playerId" | "zoneId" };

/** Whitespace and invisible characters that sneak in when IDs are copy-pasted from games/chats. */
const INVISIBLE = /[\s​-‍⁠﻿]+/gu;

/** Trim and remove inner spaces: " 1234 5678 " → "12345678". */
export function normalizePlayerId(raw: string | null | undefined): string {
  return typeof raw === "string" ? raw.replace(INVISIBLE, "") : "";
}

/** Like normalizePlayerId, and also strips the brackets MLBB shows around zone ids: "(1234)" → "1234". */
export function normalizeZoneId(raw: string | null | undefined): string {
  return normalizePlayerId(raw).replace(/^\((.*)\)$/, "$1");
}

/**
 * Heuristic ReDoS guard: reject a group containing a quantifier or an
 * alternation that is itself repeated without bound, e.g. (a+)+, (\d*)*,
 * (x+){2,}, (a|aa)+, plus back-references — these can take exponential time.
 * Normal ID patterns (^\d{5,12}$, ^[A-Za-z0-9]{4,20}$) are unaffected.
 */
function looksCatastrophic(pattern: string): boolean {
  return (
    /\((?:[^()\\]|\\.)*[+*}|](?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d*,)/.test(pattern) ||
    /\\[1-9]/.test(pattern)
  );
}

const regexCache = new Map<string, RegExp | null>();

/**
 * Compile an admin-provided pattern, anchored to the whole input. Returns null
 * (and logs) when the pattern is invalid or unsafe so callers can fall back.
 * Exported so the admin game editor can reject bad patterns on save.
 */
export function compileSafePattern(pattern: string): RegExp | null {
  const cached = regexCache.get(pattern);
  if (cached !== undefined) return cached;
  let re: RegExp | null = null;
  if (pattern.length <= MAX_PATTERN_LENGTH && !looksCatastrophic(pattern)) {
    try {
      // Anchor even if the admin forgot ^...$ so "abc123456xyz" cannot pass \d{6}.
      re = new RegExp(`^(?:${pattern})$`, "u");
    } catch {
      try {
        // Some valid non-unicode patterns (e.g. "\-" escapes) fail in u-mode.
        re = new RegExp(`^(?:${pattern})$`);
      } catch {
        re = null;
      }
    }
  }
  // Server-side only: the admin editor's live tester compiles every keystroke.
  if (!re && typeof window === "undefined") console.warn(`[validation] ignoring invalid or unsafe pattern: ${pattern}`);
  if (regexCache.size > 500) regexCache.clear();
  regexCache.set(pattern, re);
  return re;
}

function matches(value: string, pattern: string | null | undefined, fallback: RegExp): boolean {
  const re = pattern?.trim() ? (compileSafePattern(pattern.trim()) ?? fallback) : fallback;
  return re.test(value);
}

/**
 * MLBB shows ids as "123456789 (1234)"; customers often paste that whole thing
 * into the ID field. Split it when the game needs a zone and none was given.
 */
function splitCombinedId(rawId: string): { id: string; zone: string } | null {
  const m = /^\s*([\p{L}\p{N}]+)\s*\(\s*([\p{L}\p{N}]+)\s*\)\s*$/u.exec(rawId);
  return m ? { id: m[1]!, zone: m[2]! } : null;
}

/** Normalize and validate a player id (+ zone) against the game's rules. */
export function validatePlayer(
  game: PlayerGameRules,
  rawPlayerId: string | null | undefined,
  rawZoneId?: string | null,
): PlayerValidationResult {
  let idInput = typeof rawPlayerId === "string" ? rawPlayerId : "";
  let zoneInput = typeof rawZoneId === "string" ? rawZoneId : "";
  const zoneOptions = Array.isArray(game.zoneOptions) ? game.zoneOptions : [];
  const usesZone = game.requiresZone || zoneOptions.length > 0 || !!game.zonePattern?.trim();

  if (usesZone && !normalizeZoneId(zoneInput) && idInput.length <= MAX_PLAYER_ID_LENGTH * 2) {
    const combined = splitCombinedId(idInput);
    if (combined) {
      idInput = combined.id;
      zoneInput = combined.zone;
    }
  }

  const playerId = normalizePlayerId(idInput);
  if (!playerId || playerId.length > MAX_PLAYER_ID_LENGTH || !matches(playerId, game.idPattern, DEFAULT_ID_RE)) {
    return { ok: false, error: "invalid_id", field: "playerId" };
  }

  if (!usesZone) return { ok: true, playerId, zoneId: null };

  const zoneId = normalizeZoneId(zoneInput);
  if (!zoneId) {
    return game.requiresZone
      ? { ok: false, error: "invalid_zone", field: "zoneId" }
      : { ok: true, playerId, zoneId: null };
  }
  if (zoneId.length > MAX_ZONE_ID_LENGTH) return { ok: false, error: "invalid_zone", field: "zoneId" };

  if (zoneOptions.length > 0) {
    // Dropdown servers (e.g. Genshin): exact value match, case-insensitive for robustness.
    const option = zoneOptions.find((o) => o.value.toLowerCase() === zoneId.toLowerCase());
    return option
      ? { ok: true, playerId, zoneId: option.value }
      : { ok: false, error: "invalid_zone", field: "zoneId" };
  }
  if (!matches(zoneId, game.zonePattern, DEFAULT_ZONE_RE)) {
    return { ok: false, error: "invalid_zone", field: "zoneId" };
  }
  return { ok: true, playerId, zoneId };
}
