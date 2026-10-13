import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { games, orders, type OrderStatus } from "@/db/schema";
import type { Channel } from "@/lib/attribution";
import { normalizeOrderCode } from "@/lib/orders/code";
import { toCsv, type CsvColumn } from "./csv";
import { escapeLike, ORDERS_PAGE_SIZE, phoneSearchDigits, type OrderFilters } from "./order-filters";
import { addDays, parseStoreDate, STORE_UTC_OFFSET_MS } from "./time";

/** Read-side order queries for the admin orders list and CSV export. */

/** Exports beyond this are cut off (the response says so in a header) to keep memory bounded. */
export const EXPORT_MAX_ROWS = 10_000;

/** WHERE clause for the filters; undefined when there are none. */
export function buildOrderConditions(f: OrderFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (f.statuses.length) conditions.push(inArray(orders.status, f.statuses));
  if (f.game) conditions.push(eq(orders.gameSlug, f.game));
  if (f.channel) conditions.push(eq(orders.channel, f.channel));
  const from = parseStoreDate(f.from);
  if (from) conditions.push(gte(orders.createdAt, from));
  const to = parseStoreDate(f.to);
  if (to) conditions.push(lt(orders.createdAt, addDays(to, 1)));

  if (f.q) {
    const term = f.q.trim();
    const like = `%${escapeLike(term)}%`;
    const search: SQL[] = [
      ilike(orders.code, like),
      ilike(orders.playerId, like),
      ilike(orders.playerName, like),
      ilike(orders.contactPhone, like),
      ilike(orders.contactTelegram, `%${escapeLike(term.replace(/^@/, ""))}%`),
    ];
    const code = normalizeOrderCode(term);
    if (code) search.push(eq(orders.code, code));
    const digits = phoneSearchDigits(term);
    if (digits.length >= 4) {
      search.push(
        sql`regexp_replace(coalesce(${orders.contactPhone}, ''), '[^0-9]', '', 'g') like ${`%${digits}%`}`,
      );
    }
    conditions.push(or(...search)!);
  }
  return conditions.length ? and(...conditions) : undefined;
}

const listColumns = {
  id: orders.id,
  code: orders.code,
  status: orders.status,
  gameSlug: orders.gameSlug,
  gameName: orders.gameName,
  packageName: orders.packageName,
  playerId: orders.playerId,
  zoneId: orders.zoneId,
  playerName: orders.playerName,
  totalCents: orders.totalCents,
  discountCents: orders.discountCents,
  promoCode: orders.promoCode,
  channel: orders.channel,
  contactPhone: orders.contactPhone,
  contactTelegram: orders.contactTelegram,
  createdAt: orders.createdAt,
  paidAt: orders.paidAt,
  deliveredAt: orders.deliveredAt,
};

export type AdminOrderRow = {
  id: string;
  code: string;
  status: OrderStatus;
  gameSlug: string;
  gameName: string;
  packageName: string;
  playerId: string;
  zoneId: string | null;
  playerName: string | null;
  totalCents: number;
  discountCents: number;
  promoCode: string | null;
  channel: Channel | string;
  contactPhone: string | null;
  contactTelegram: string | null;
  createdAt: Date;
  paidAt: Date | null;
  deliveredAt: Date | null;
};

export type AdminOrderPage = {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

/** One page of orders, newest first. `page` past the end returns no rows (the UI links back). */
export async function listAdminOrders(
  filters: OrderFilters,
  page = 1,
  pageSize = ORDERS_PAGE_SIZE,
): Promise<AdminOrderPage> {
  const where = buildOrderConditions(filters);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const [rows, [totals]] = await Promise.all([
    db
      .select(listColumns)
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(pageSize)
      .offset((safePage - 1) * pageSize),
    db.select({ total: count() }).from(orders).where(where),
  ]);
  const total = totals?.total ?? 0;
  return {
    rows,
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

const exportColumns = {
  ...listColumns,
  unitPriceCents: orders.unitPriceCents,
  currency: orders.currency,
  paymentRef: orders.paymentRef,
  customerTelegramChatId: orders.customerTelegramChatId,
  locale: orders.locale,
  utmSource: orders.utmSource,
  utmMedium: orders.utmMedium,
  utmCampaign: orders.utmCampaign,
  utmContent: orders.utmContent,
  utmTerm: orders.utmTerm,
  clickId: orders.clickId,
  referrer: orders.referrer,
  landingPath: orders.landingPath,
};

export type ExportOrderRow = AdminOrderRow & {
  unitPriceCents: number;
  currency: string;
  paymentRef: string | null;
  customerTelegramChatId: string | null;
  locale: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  clickId: string | null;
  referrer: string | null;
  landingPath: string | null;
};

/** Up to `limit` matching orders, oldest first (natural order for spreadsheets). */
export async function listOrdersForExport(
  filters: OrderFilters,
  limit = EXPORT_MAX_ROWS,
): Promise<ExportOrderRow[]> {
  return db
    .select(exportColumns)
    .from(orders)
    .where(buildOrderConditions(filters))
    .orderBy(asc(orders.createdAt), asc(orders.id))
    .limit(limit);
}

/** "2026-10-13 14:05:09" in Phnom Penh time — sorts correctly and Excel parses it. */
function storeTimestamp(date: Date | null): string {
  if (!date) return "";
  return new Date(date.getTime() + STORE_UTC_OFFSET_MS).toISOString().slice(0, 19).replace("T", " ");
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

export const ORDER_CSV_COLUMNS: CsvColumn<ExportOrderRow>[] = [
  { header: "order_code", value: (o) => o.code },
  { header: "created_at_ict", value: (o) => storeTimestamp(o.createdAt) },
  { header: "status", value: (o) => o.status },
  { header: "game", value: (o) => o.gameName },
  { header: "game_slug", value: (o) => o.gameSlug },
  { header: "package", value: (o) => o.packageName },
  { header: "player_id", value: (o) => o.playerId },
  { header: "zone_id", value: (o) => o.zoneId },
  { header: "player_name", value: (o) => o.playerName },
  { header: "unit_price_usd", value: (o) => dollars(o.unitPriceCents) },
  { header: "discount_usd", value: (o) => dollars(o.discountCents) },
  { header: "total_usd", value: (o) => dollars(o.totalCents) },
  { header: "currency", value: (o) => o.currency },
  { header: "promo_code", value: (o) => o.promoCode },
  { header: "paid_at_ict", value: (o) => storeTimestamp(o.paidAt) },
  { header: "delivered_at_ict", value: (o) => storeTimestamp(o.deliveredAt) },
  { header: "payment_ref", value: (o) => o.paymentRef },
  { header: "contact_phone", value: (o) => o.contactPhone },
  { header: "contact_telegram", value: (o) => o.contactTelegram },
  { header: "telegram_linked", value: (o) => (o.customerTelegramChatId ? "yes" : "no") },
  { header: "locale", value: (o) => o.locale },
  { header: "channel", value: (o) => o.channel },
  { header: "utm_source", value: (o) => o.utmSource },
  { header: "utm_medium", value: (o) => o.utmMedium },
  { header: "utm_campaign", value: (o) => o.utmCampaign },
  { header: "utm_content", value: (o) => o.utmContent },
  { header: "utm_term", value: (o) => o.utmTerm },
  { header: "click_id", value: (o) => o.clickId },
  { header: "referrer", value: (o) => o.referrer },
  { header: "landing_path", value: (o) => o.landingPath },
];

export function ordersToCsv(rows: readonly ExportOrderRow[]): string {
  return toCsv(rows, ORDER_CSV_COLUMNS);
}

/** Games for the filter dropdown: the catalog plus slugs only found on old orders (deleted games). */
export async function listOrderGameOptions(): Promise<{ slug: string; name: string }[]> {
  const [catalog, fromOrders] = await Promise.all([
    db.select({ slug: games.slug, name: games.name }).from(games).orderBy(asc(games.sortOrder), asc(games.name)),
    db
      .selectDistinctOn([orders.gameSlug], { slug: orders.gameSlug, name: orders.gameName })
      .from(orders)
      .orderBy(orders.gameSlug, desc(orders.createdAt))
      .limit(200),
  ]);
  const seen = new Set(catalog.map((g) => g.slug));
  return [...catalog, ...fromOrders.filter((g) => !seen.has(g.slug))];
}
