/**
 * "Recent orders on this device" (shown on /track) and remembered player ids
 * per game. Pure parsing helpers are separated from storage access so they can
 * be unit tested; storage access itself lives in ./storage (never throws).
 */

export const RECENT_ORDERS_KEY = "sk_recent_orders";
export const MAX_RECENT_ORDERS = 10;

export type RecentOrder = {
  code: string;
  gameSlug?: string;
  gameName?: string;
  packageName?: string;
  totalCents?: number;
  /** ISO timestamp */
  createdAt?: string;
};

const CODE_RE = /^[A-Z0-9]{6,16}$/;

/**
 * Normalize user input into an order code: uppercase, without spaces, dashes
 * or a leading "#". Returns null when it cannot be a valid code.
 */
export function normalizeOrderCode(input: string | null | undefined): string | null {
  const code = (input ?? "").toUpperCase().replace(/[\s#-]/g, "");
  return CODE_RE.test(code) ? code : null;
}

const str = (v: unknown, max = 120) => (typeof v === "string" && v ? v.slice(0, max) : undefined);

/** Parse the stored list; tolerates corrupt JSON and legacy plain-string entries. */
export function parseRecentOrders(raw: string | null | undefined): RecentOrder[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: RecentOrder[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    const obj = typeof item === "string" ? { code: item } : item;
    if (!obj || typeof obj !== "object") continue;
    const rec = obj as Record<string, unknown>;
    const code = normalizeOrderCode(typeof rec.code === "string" ? rec.code : null);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({
      code,
      gameSlug: str(rec.gameSlug, 64),
      gameName: str(rec.gameName),
      packageName: str(rec.packageName),
      totalCents:
        typeof rec.totalCents === "number" && Number.isFinite(rec.totalCents) ? rec.totalCents : undefined,
      createdAt: str(rec.createdAt, 40),
    });
    if (out.length >= MAX_RECENT_ORDERS) break;
  }
  return out;
}

/** Put `entry` first (replacing any older entry with the same code), capped at MAX_RECENT_ORDERS. */
export function addRecentOrder(list: RecentOrder[], entry: RecentOrder): RecentOrder[] {
  const code = normalizeOrderCode(entry.code);
  if (!code) return list.slice(0, MAX_RECENT_ORDERS);
  return [{ ...entry, code }, ...list.filter((o) => o.code !== code)].slice(0, MAX_RECENT_ORDERS);
}

export function hasRecentOrder(raw: string | null | undefined, code: string): boolean {
  return parseRecentOrders(raw).some((o) => o.code === code);
}

// ── Remembered player id / zone per game ──

export const playerMemoryKey = (gameSlug: string) => `sk_player_${gameSlug}`;

export type PlayerMemory = { playerId: string; zoneId: string };

export function parsePlayerMemory(raw: string | null | undefined): PlayerMemory | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const playerId = typeof v?.playerId === "string" ? v.playerId.slice(0, 64) : "";
    const zoneId = typeof v?.zoneId === "string" ? v.zoneId.slice(0, 32) : "";
    return playerId ? { playerId, zoneId } : null;
  } catch {
    return null;
  }
}

// ── Purchase pixel guard ──

/** localStorage key set once the Purchase pixel event fired for an order. */
export const purchaseTrackedKey = (code: string) => `sk_purchase_${code}`;
