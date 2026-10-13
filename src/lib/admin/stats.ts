import "server-only";
import { and, asc, count, desc, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, type OrderStatus } from "@/db/schema";
import { CHANNELS, type Channel } from "@/lib/attribution";
import { PAID_STATUSES, REVENUE_STATUSES } from "@/lib/orders/status";
import { NEEDS_ACTION_STATUSES } from "./order-filters";
import { lastDaysWindow, lastStoreDays, startOfStoreDay, STORE_TIME_ZONE } from "./time";

/**
 * Sales analytics for the dashboard and the marketing page.
 *
 * Conventions (keep every widget consistent so the numbers add up):
 *  - Windows are by ORDER DATE (orders.created_at) in Phnom Penh time and are
 *    half-open [from, to). KHQR payments complete within minutes of the order,
 *    so order date ≈ payment date, and the same window gives a clean
 *    conversion rate (paid ÷ created) without ever exceeding 100%.
 *  - Revenue = sum of total_cents for REVENUE_STATUSES (paid, processing,
 *    delivered): failed orders may still be refunded and refunded ones are not ours.
 *  - "Paid" = PAID_STATUSES (money was received, whatever happened next).
 */

const paidStatuses = [...PAID_STATUSES] as OrderStatus[];
const revenueStatuses = [...REVENUE_STATUSES] as OrderStatus[];

const isPaid = inArray(orders.status, paidStatuses);
const isRevenue = inArray(orders.status, revenueStatuses);
const revenueSum = sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${isRevenue}), 0)`.mapWith(Number);
const revenueCount = sql<number>`count(*) filter (where ${isRevenue})`.mapWith(Number);
const paidCount = sql<number>`count(*) filter (where ${isPaid})`.mapWith(Number);

export type DateWindow = { from: Date; to: Date };

const inWindow = ({ from, to }: DateWindow) => and(gte(orders.createdAt, from), lt(orders.createdAt, to));

// ───────────────────────────── channels ─────────────────────────────

export type ChannelStat = {
  channel: Channel;
  /** Orders created in the window (any status). */
  orders: number;
  /** Of those, how many were paid. */
  paidOrders: number;
  revenueCents: number;
  /** Revenue ÷ revenue orders, rounded; 0 when none. */
  avgOrderCents: number;
};

/**
 * Orders, paid orders and revenue per marketing channel for orders created in
 * [from, to). Always returns every channel (zero-filled) in CHANNELS order;
 * unknown stored values are counted as "other".
 */
export async function getChannelStats({ from, to }: DateWindow): Promise<ChannelStat[]> {
  const rows = await db
    .select({
      channel: orders.channel,
      orders: count(),
      paidOrders: paidCount,
      revenueCents: revenueSum,
      revenueOrders: revenueCount,
    })
    .from(orders)
    .where(inWindow({ from, to }))
    .groupBy(orders.channel);

  const acc = new Map<Channel, { orders: number; paidOrders: number; revenueCents: number; revenueOrders: number }>(
    CHANNELS.map((c) => [c, { orders: 0, paidOrders: 0, revenueCents: 0, revenueOrders: 0 }]),
  );
  for (const row of rows) {
    const key = (CHANNELS as readonly string[]).includes(row.channel) ? (row.channel as Channel) : "other";
    const a = acc.get(key)!;
    a.orders += row.orders;
    a.paidOrders += row.paidOrders;
    a.revenueCents += row.revenueCents;
    a.revenueOrders += row.revenueOrders;
  }
  return CHANNELS.map((channel) => {
    const a = acc.get(channel)!;
    return {
      channel,
      orders: a.orders,
      paidOrders: a.paidOrders,
      revenueCents: a.revenueCents,
      avgOrderCents: a.revenueOrders ? Math.round(a.revenueCents / a.revenueOrders) : 0,
    };
  });
}

// ───────────────────────────── KPIs ─────────────────────────────

export type DashboardKpis = {
  revenueTodayCents: number;
  revenue7dCents: number;
  revenue30dCents: number;
  paidOrdersToday: number;
  /** paid + processing: money in, top-up not done yet. */
  awaitingDelivery: number;
  failed: number;
  /** Orders created in the last 7 days and how many of them were paid. */
  conversion7d: { created: number; paid: number; rate: number | null };
};

export async function getDashboardKpis(now: Date = new Date()): Promise<DashboardKpis> {
  const today = startOfStoreDay(now);
  const w7 = lastDaysWindow(7, now);
  const w30 = lastDaysWindow(30, now);
  const isToday = gte(orders.createdAt, today);
  const in7 = gte(orders.createdAt, w7.from);

  const [[windowed], [queue]] = await Promise.all([
    db
      .select({
        revenueToday: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${isRevenue} and ${isToday}), 0)`.mapWith(Number),
        revenue7d: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${isRevenue} and ${in7}), 0)`.mapWith(Number),
        revenue30d: revenueSum,
        paidToday: sql<number>`count(*) filter (where ${isPaid} and ${isToday})`.mapWith(Number),
        created7d: sql<number>`count(*) filter (where ${in7})`.mapWith(Number),
        paid7d: sql<number>`count(*) filter (where ${isPaid} and ${in7})`.mapWith(Number),
      })
      .from(orders)
      .where(inWindow(w30)),
    db
      .select({
        awaiting: sql<number>`count(*) filter (where ${inArray(orders.status, ["paid", "processing"])})`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${orders.status} = 'failed')`.mapWith(Number),
      })
      .from(orders)
      .where(inArray(orders.status, [...NEEDS_ACTION_STATUSES])),
  ]);

  const created = windowed?.created7d ?? 0;
  const paid = windowed?.paid7d ?? 0;
  return {
    revenueTodayCents: windowed?.revenueToday ?? 0,
    revenue7dCents: windowed?.revenue7d ?? 0,
    revenue30dCents: windowed?.revenue30d ?? 0,
    paidOrdersToday: windowed?.paidToday ?? 0,
    awaitingDelivery: queue?.awaiting ?? 0,
    failed: queue?.failed ?? 0,
    conversion7d: { created, paid, rate: created ? paid / created : null },
  };
}

// ───────────────────────────── daily revenue ─────────────────────────────

export type DailyRevenue = { date: string; revenueCents: number; paidOrders: number; orders: number };

/**
 * Revenue per Phnom Penh day for the last `days` days (oldest first, today
 * last), zero-filled. Days are bucketed in SQL with AT TIME ZONE so an order
 * at 23:30 UTC lands on the next local day.
 */
export async function getDailyRevenue(days = 14, now: Date = new Date()): Promise<DailyRevenue[]> {
  const buckets = lastStoreDays(days, now);
  const window = { from: buckets[0]!.start, to: lastDaysWindow(1, now).to };
  // The zone is inlined (a constant), not a bind parameter: SELECT and GROUP BY must render identical SQL.
  const day = sql<string>`to_char(${orders.createdAt} at time zone ${sql.raw(`'${STORE_TIME_ZONE}'`)}, 'YYYY-MM-DD')`;
  const rows = await db
    .select({ date: day, revenueCents: revenueSum, paidOrders: paidCount, orders: count() })
    .from(orders)
    .where(inWindow(window))
    .groupBy(day);
  const byDay = new Map(rows.map((r) => [r.date, r]));
  return buckets.map(({ key }) => {
    const r = byDay.get(key);
    return { date: key, revenueCents: r?.revenueCents ?? 0, paidOrders: r?.paidOrders ?? 0, orders: r?.orders ?? 0 };
  });
}

// ───────────────────────────── top games ─────────────────────────────

export type TopGame = { gameSlug: string; gameName: string; paidOrders: number; revenueCents: number };

/** Best-selling games by revenue for orders created in [from, to). */
export async function getTopGames({ from, to }: DateWindow, limit = 5): Promise<TopGame[]> {
  const revenue = sql<number>`coalesce(sum(${orders.totalCents}), 0)`.mapWith(Number);
  return db
    .select({
      gameSlug: orders.gameSlug,
      // Snapshot names can differ after a rename; show the latest one.
      gameName: sql<string>`(array_agg(${orders.gameName} order by ${orders.createdAt} desc))[1]`,
      paidOrders: count(),
      revenueCents: revenue,
    })
    .from(orders)
    .where(and(inWindow({ from, to }), isRevenue))
    .groupBy(orders.gameSlug)
    .orderBy(desc(revenue), desc(count()), asc(orders.gameSlug))
    .limit(limit);
}

// ───────────────────────────── queues ─────────────────────────────

const queueColumns = {
  id: orders.id,
  code: orders.code,
  status: orders.status,
  gameName: orders.gameName,
  packageName: orders.packageName,
  playerId: orders.playerId,
  zoneId: orders.zoneId,
  playerName: orders.playerName,
  totalCents: orders.totalCents,
  channel: orders.channel,
  createdAt: orders.createdAt,
  paidAt: orders.paidAt,
};

export type QueueOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  gameName: string;
  packageName: string;
  playerId: string;
  zoneId: string | null;
  playerName: string | null;
  totalCents: number;
  channel: string;
  createdAt: Date;
  paidAt: Date | null;
};

/** Paid / processing / failed orders, the longest-waiting customer first. */
export async function getNeedsDelivery(limit = 20): Promise<QueueOrder[]> {
  return db
    .select(queueColumns)
    .from(orders)
    .where(inArray(orders.status, [...NEEDS_ACTION_STATUSES]))
    .orderBy(sql`coalesce(${orders.paidAt}, ${orders.createdAt}) asc`, asc(orders.createdAt))
    .limit(limit);
}

/** Nav badge: orders the owner still has to deliver or resolve. */
export async function countOrdersNeedingAction(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(orders)
    .where(inArray(orders.status, [...NEEDS_ACTION_STATUSES]));
  return row?.n ?? 0;
}

export async function getRecentOrders(limit = 8): Promise<QueueOrder[]> {
  return db.select(queueColumns).from(orders).orderBy(desc(orders.createdAt), desc(orders.id)).limit(limit);
}
