import { CHANNELS, type Channel } from "@/lib/attribution";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/status";
import { parseStoreDate } from "./time";

/**
 * Orders list filters, parsed from the URL (?status=paid&status=failed&game=…).
 * The same parser feeds the orders page, its pagination links and the CSV
 * export, so "Export" always exports exactly what the table shows.
 * Untrusted input: everything is whitelisted / length-capped.
 * Pure; safe for server and client.
 */

export const ORDERS_PAGE_SIZE = 25;
const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 64;

/** Orders the owner has to act on (deliver, or retry/refund failures). Used by the nav badge. */
export const NEEDS_ACTION_STATUSES = ["paid", "processing", "failed"] as const satisfies readonly OrderStatus[];

export type OrderFilters = {
  statuses: OrderStatus[];
  /** Game slug (orders keep a snapshot slug, so deleted games stay filterable). */
  game: string | null;
  channel: Channel | null;
  /** Inclusive Phnom Penh days, "YYYY-MM-DD". */
  from: string | null;
  to: string | null;
  /** Order code / player id / phone / telegram / player name. */
  q: string | null;
};

export type SearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export const EMPTY_FILTERS: OrderFilters = {
  statuses: [],
  game: null,
  channel: null,
  from: null,
  to: null,
  q: null,
};

function getAll(input: SearchParamsInput, key: string): string[] {
  if (input instanceof URLSearchParams) return input.getAll(key);
  const v = input[key];
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function getOne(input: SearchParamsInput, key: string): string | null {
  const v = getAll(input, key)[0];
  return typeof v === "string" ? v : null;
}

const STATUS_SET = new Set<string>(ORDER_STATUSES);
const CHANNEL_SET = new Set<string>(CHANNELS);

export function parseOrderFilters(input: SearchParamsInput): OrderFilters & { page: number } {
  // Accept both repeated keys (checkbox GET forms) and comma lists (hand-made links).
  const requested = new Set(
    getAll(input, "status")
      .flatMap((s) => s.split(","))
      .map((s) => s.trim()),
  );
  const statuses = ORDER_STATUSES.filter((s) => requested.has(s) && STATUS_SET.has(s));

  const gameRaw = getOne(input, "game")?.trim().toLowerCase() ?? "";
  const game = /^[a-z0-9][a-z0-9-]{0,63}$/.test(gameRaw) ? gameRaw : null;

  const channelRaw = getOne(input, "channel")?.trim().toLowerCase() ?? "";
  const channel = CHANNEL_SET.has(channelRaw) ? (channelRaw as Channel) : null;

  let from = parseStoreDate(getOne(input, "from")) ? getOne(input, "from")!.trim() : null;
  let to = parseStoreDate(getOne(input, "to")) ? getOne(input, "to")!.trim() : null;
  if (from && to && from > to) [from, to] = [to, from];

  const qRaw = (getOne(input, "q") ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
  const q = qRaw || null;

  const pageNum = Number.parseInt(getOne(input, "page") ?? "", 10);
  const page = Number.isFinite(pageNum) ? Math.min(MAX_PAGE, Math.max(1, pageNum)) : 1;

  return { statuses, game, channel, from, to, q, page };
}

/** Query string for the filters (without "?"); page omitted when 1. */
export function orderFiltersToQuery(filters: OrderFilters, page = 1): string {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  for (const s of filters.statuses) p.append("status", s);
  if (filters.game) p.set("game", filters.game);
  if (filters.channel) p.set("channel", filters.channel);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (page > 1) p.set("page", String(page));
  return p.toString();
}

export function countActiveFilters(f: OrderFilters): number {
  return (
    (f.statuses.length ? 1 : 0) +
    (f.game ? 1 : 0) +
    (f.channel ? 1 : 0) +
    (f.from || f.to ? 1 : 0) +
    (f.q ? 1 : 0)
  );
}

/** Escape LIKE wildcards so a search for "50%" or "a_b" matches literally. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Digits used to match phone numbers however they were typed:
 * "+855 12 345 678", "012345678" and "12345678" all become "12345678".
 */
export function phoneSearchDigits(term: string): string {
  let digits = term.replace(/\D/g, "");
  if (digits.startsWith("855")) digits = digits.slice(3);
  return digits.replace(/^0+/, "");
}
