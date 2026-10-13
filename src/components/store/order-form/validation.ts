/**
 * Client-side player id / zone validation for the order form. Mirrors the
 * server rules in src/lib/orders/validation.ts (which re-validates on order
 * creation) so customers get instant, matching feedback before they pay.
 * Patterns come from the admin-managed games table and are compiled
 * defensively: an unusable pattern falls back to the default rule.
 */

export const MAX_PLAYER_ID_LENGTH = 64;
export const MAX_ZONE_ID_LENGTH = 32;

/** Same defaults as the server when a game has no (usable) pattern. */
const DEFAULT_ID_RE = /^[\p{L}\p{N}._#@-]{2,64}$/u;
const DEFAULT_ZONE_RE = /^[\p{L}\p{N}._-]{1,32}$/u;

const cache = new Map<string, RegExp | null>();

/** Compile an admin pattern anchored to the whole input; null when invalid or overly long. */
export function compilePattern(pattern: string | null | undefined): RegExp | null {
  const p = pattern?.trim();
  if (!p || p.length > 160) return null;
  const hit = cache.get(p);
  if (hit !== undefined) return hit;
  let re: RegExp | null = null;
  try {
    re = new RegExp(`^(?:${p})$`, "u");
  } catch {
    try {
      re = new RegExp(`^(?:${p})$`);
    } catch {
      re = null;
    }
  }
  cache.set(p, re);
  return re;
}

/**
 * True when the pattern only accepts digits (e.g. ^\d{5,12}$ or ^[0-9]+$), so
 * the field can use inputmode="numeric" and show the number pad on phones.
 */
export function isNumericPattern(pattern: string | null | undefined): boolean {
  if (!pattern) return false;
  return /^\^?(?:\\d|\[0-9\])(?:\{\d+(?:,\d*)?\}|[+*])?\$?$/.test(pattern.trim());
}

/** Whitespace and invisible characters that sneak in when ids are copy-pasted. */
const INVISIBLE = /[\s​-‍⁠﻿]+/gu;

export function normalizePlayerId(raw: string): string {
  return raw.replace(INVISIBLE, "");
}

/** Like normalizePlayerId, and strips the brackets MLBB shows around zone ids: "(1234)" -> "1234". */
export function normalizeZoneId(raw: string): string {
  return normalizePlayerId(raw).replace(/^\((.*)\)$/, "$1");
}

export type FieldIssue = "required" | "invalid";

export type ZoneRules = {
  requiresZone: boolean;
  zonePattern: string | null;
  zoneOptions: { value: string; label: string }[] | null;
};

/** Does this game ask for a zone/server at all (required or optional)? */
export function usesZone(game: ZoneRules): boolean {
  return game.requiresZone || (game.zoneOptions?.length ?? 0) > 0 || !!game.zonePattern?.trim();
}

export function validatePlayerIdField(value: string, pattern: string | null | undefined): FieldIssue | null {
  const v = normalizePlayerId(value);
  if (!v) return "required";
  if (v.length > MAX_PLAYER_ID_LENGTH) return "invalid";
  return (compilePattern(pattern) ?? DEFAULT_ID_RE).test(v) ? null : "invalid";
}

export function validateZoneField(value: string, game: ZoneRules): FieldIssue | null {
  if (!usesZone(game)) return null;
  const v = normalizeZoneId(value);
  if (!v) return game.requiresZone ? "required" : null;
  if (v.length > MAX_ZONE_ID_LENGTH) return "invalid";
  const options = game.zoneOptions ?? [];
  if (options.length > 0) return options.some((o) => o.value.toLowerCase() === v.toLowerCase()) ? null : "invalid";
  return (compilePattern(game.zonePattern) ?? DEFAULT_ZONE_RE).test(v) ? null : "invalid";
}

/**
 * Mobile Legends shows ids as "123456789 (1234)". When a customer pastes that
 * into the id field we split it into id + zone.
 */
export function splitIdAndZone(value: string): { id: string; zone: string } | null {
  const m = value.match(/^\s*([\p{L}\p{N}]{3,64})\s*[([]\s*([\p{L}\p{N}]{1,32})\s*[)\]]\s*$/u);
  return m ? { id: m[1]!, zone: m[2]! } : null;
}
