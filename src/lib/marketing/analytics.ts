import "server-only";
import { and, count, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, promoCodes, type OrderStatus } from "@/db/schema";
import { getChannelStats, type ChannelStat, type DateWindow } from "@/lib/admin/stats";
import { lastDaysWindow } from "@/lib/admin/time";
import type { Channel } from "@/lib/attribution";
import { PAID_STATUSES, REVENUE_STATUSES } from "@/lib/orders/status";

/**
 * Marketing analytics for /admin/marketing: which channel, promo code and
 * campaign actually sells. Same conventions as src/lib/admin/stats.ts (the
 * dashboard) so the numbers agree everywhere:
 *  - windows are by order date, Phnom Penh days, half-open [from, to);
 *  - "paid" = PAID_STATUSES (money received), revenue = REVENUE_STATUSES.
 */

export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

export function parsePeriod(value: unknown): PeriodDays {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIODS as readonly number[]).includes(n) ? (n as PeriodDays) : 30;
}

const paidStatuses = [...PAID_STATUSES] as OrderStatus[];
const revenueStatuses = [...REVENUE_STATUSES] as OrderStatus[];
const isPaid = inArray(orders.status, paidStatuses);
const isRevenue = inArray(orders.status, revenueStatuses);
const paidCount = sql<number>`count(*) filter (where ${isPaid})`.mapWith(Number);
const revenueCount = sql<number>`count(*) filter (where ${isRevenue})`.mapWith(Number);
const revenueSum = sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${isRevenue}), 0)`.mapWith(Number);
const discountSum = sql<number>`coalesce(sum(${orders.discountCents}) filter (where ${isRevenue}), 0)`.mapWith(Number);

const inWindow = ({ from, to }: DateWindow) => and(gte(orders.createdAt, from), lt(orders.createdAt, to));

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

// ───────────────────────────── channels ─────────────────────────────

export type ChannelPerformanceRow = ChannelStat & {
  /** paid ÷ created, null when no orders. */
  conversionRate: number | null;
  /** Share of total revenue in the window (0–1). */
  revenueShare: number;
};

export type ChannelPerformance = {
  days: PeriodDays;
  window: DateWindow;
  rows: ChannelPerformanceRow[];
  totals: {
    orders: number;
    paidOrders: number;
    revenueCents: number;
    avgOrderCents: number;
    conversionRate: number | null;
  };
};

/** Orders, paid orders, revenue, AOV and conversion per channel for the last `days` store days. */
export async function getChannelPerformance(days: PeriodDays, now: Date = new Date()): Promise<ChannelPerformance> {
  const window = lastDaysWindow(days, now);
  const [stats, [totals]] = await Promise.all([
    getChannelStats(window),
    db
      .select({ orders: count(), paidOrders: paidCount, revenueCents: revenueSum, revenueOrders: revenueCount })
      .from(orders)
      .where(inWindow(window)),
  ]);
  const revenueCents = totals?.revenueCents ?? 0;
  const ordersTotal = totals?.orders ?? 0;
  const paidOrders = totals?.paidOrders ?? 0;
  const revenueOrders = totals?.revenueOrders ?? 0;
  return {
    days,
    window,
    rows: stats.map((s) => ({
      ...s,
      conversionRate: ratio(s.paidOrders, s.orders),
      revenueShare: revenueCents > 0 ? s.revenueCents / revenueCents : 0,
    })),
    totals: {
      orders: ordersTotal,
      paidOrders,
      revenueCents,
      avgOrderCents: revenueOrders ? Math.round(revenueCents / revenueOrders) : 0,
      conversionRate: ratio(paidOrders, ordersTotal),
    },
  };
}

// ───────────────────────────── promo codes ─────────────────────────────

/** Channel a promo code is promoted on; "none" = general code (e.g. WELCOME5). */
export const PROMO_CHANNELS = ["facebook", "tiktok", "telegram", "other", "none"] as const;
export type PromoChannel = (typeof PROMO_CHANNELS)[number];

function promoChannelOf(value: string | null | undefined): PromoChannel {
  if (!value) return "none";
  return (PROMO_CHANNELS as readonly string[]).includes(value) ? (value as PromoChannel) : "other";
}

export type PromoCodeUsage = {
  code: string;
  promoChannel: PromoChannel;
  /** null when the code was deleted (orders keep the code text). */
  active: boolean | null;
  orders: number;
  paidOrders: number;
  revenueCents: number;
  /** Discount given on revenue orders. */
  discountCents: number;
};

export type PromoChannelUsage = {
  promoChannel: PromoChannel;
  orders: number;
  paidOrders: number;
  revenueCents: number;
  discountCents: number;
  codes: PromoCodeUsage[];
};

/**
 * Promo code usage in the window, grouped by the channel each code is
 * promoted on. Active channel codes with no orders are listed too (zero
 * rows tell you a channel is not converting). Groups without codes are omitted.
 */
export async function getPromoUsageByChannel(window: DateWindow): Promise<PromoChannelUsage[]> {
  const [used, codes] = await Promise.all([
    db
      .select({
        code: orders.promoCode,
        promoChannel: promoCodes.channel,
        active: promoCodes.active,
        orders: count(),
        paidOrders: paidCount,
        revenueCents: revenueSum,
        discountCents: discountSum,
      })
      .from(orders)
      // Orders keep the code text, so usage survives a deleted/re-created code.
      .leftJoin(promoCodes, eq(promoCodes.code, orders.promoCode))
      .where(and(inWindow(window), isNotNull(orders.promoCode)))
      .groupBy(orders.promoCode, promoCodes.channel, promoCodes.active),
    db
      .select({ code: promoCodes.code, channel: promoCodes.channel, active: promoCodes.active })
      .from(promoCodes)
      .where(and(eq(promoCodes.active, true), isNotNull(promoCodes.channel))),
  ]);

  const byCode = new Map<string, PromoCodeUsage>();
  for (const row of used) {
    if (!row.code) continue;
    byCode.set(row.code, {
      code: row.code,
      promoChannel: promoChannelOf(row.promoChannel),
      active: row.active ?? null,
      orders: row.orders,
      paidOrders: row.paidOrders,
      revenueCents: row.revenueCents,
      discountCents: row.discountCents,
    });
  }
  for (const c of codes) {
    if (byCode.has(c.code)) continue;
    byCode.set(c.code, {
      code: c.code,
      promoChannel: promoChannelOf(c.channel),
      active: c.active,
      orders: 0,
      paidOrders: 0,
      revenueCents: 0,
      discountCents: 0,
    });
  }

  return PROMO_CHANNELS.map((promoChannel) => {
    const list = [...byCode.values()]
      .filter((u) => u.promoChannel === promoChannel)
      .sort((a, b) => b.revenueCents - a.revenueCents || b.orders - a.orders || a.code.localeCompare(b.code));
    return {
      promoChannel,
      orders: list.reduce((s, u) => s + u.orders, 0),
      paidOrders: list.reduce((s, u) => s + u.paidOrders, 0),
      revenueCents: list.reduce((s, u) => s + u.revenueCents, 0),
      discountCents: list.reduce((s, u) => s + u.discountCents, 0),
      codes: list,
    };
  }).filter((g) => g.codes.length > 0);
}

// ───────────────────────────── campaigns ─────────────────────────────

export type CampaignStat = {
  channel: Channel | string;
  source: string | null;
  campaign: string;
  orders: number;
  paidOrders: number;
  revenueCents: number;
};

/**
 * Best utm_campaign values (game slug, template, "bio", …) in the window:
 * which post, video or ad sold. Only orders that carried a campaign.
 */
export async function getTopCampaigns(window: DateWindow, limit = 10): Promise<CampaignStat[]> {
  const rows = await db
    .select({
      channel: orders.channel,
      source: orders.utmSource,
      campaign: orders.utmCampaign,
      orders: count(),
      paidOrders: paidCount,
      revenueCents: revenueSum,
    })
    .from(orders)
    .where(and(inWindow(window), isNotNull(orders.utmCampaign)))
    .groupBy(orders.channel, orders.utmSource, orders.utmCampaign)
    .orderBy(desc(revenueSum), desc(count()), orders.utmCampaign)
    .limit(limit);
  return rows.map((r) => ({ ...r, campaign: r.campaign ?? "" }));
}
