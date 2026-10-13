import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import {
  countOrdersNeedingAction,
  getChannelStats,
  getDailyRevenue,
  getDashboardKpis,
  getNeedsDelivery,
  getRecentOrders,
  getTopGames,
} from "./stats";
import { insertTestOrder } from "./test-orders";

// 2026-10-13 10:00 in Phnom Penh (03:00 UTC).
const NOW = new Date("2026-10-13T03:00:00Z");
const at = (iso: string) => new Date(iso);

beforeEach(async () => {
  await resetDb();
});

describe("getChannelStats", () => {
  it("returns every channel zero-filled in a stable order", async () => {
    const stats = await getChannelStats({ from: at("2026-10-01T00:00:00Z"), to: NOW });
    expect(stats.map((s) => s.channel)).toEqual(["facebook", "tiktok", "telegram", "google", "direct", "other"]);
    expect(stats.every((s) => s.orders === 0 && s.revenueCents === 0 && s.avgOrderCents === 0)).toBe(true);
  });

  it("counts orders, paid orders and revenue per channel inside the window", async () => {
    const inside = at("2026-10-12T05:00:00Z");
    await insertTestOrder({ channel: "facebook", status: "delivered", totalCents: 300, createdAt: inside });
    await insertTestOrder({ channel: "facebook", status: "processing", totalCents: 100, createdAt: inside });
    await insertTestOrder({ channel: "facebook", status: "pending_payment", totalCents: 999, createdAt: inside });
    // Paid but refunded/failed: counts as paid, not as revenue.
    await insertTestOrder({ channel: "facebook", status: "refunded", totalCents: 500, createdAt: inside });
    await insertTestOrder({ channel: "tiktok", status: "failed", totalCents: 700, createdAt: inside });
    await insertTestOrder({ channel: "tiktok", status: "paid", totalCents: 250, createdAt: inside });
    await insertTestOrder({ channel: "tiktok", status: "expired", totalCents: 250, createdAt: inside });
    // Unknown stored channel folds into "other".
    await insertTestOrder({ channel: "myspace", status: "delivered", totalCents: 50, createdAt: inside });
    // Outside the window (before / at the exclusive end).
    await insertTestOrder({ channel: "facebook", status: "delivered", totalCents: 10_000, createdAt: at("2026-09-30T23:59:59Z") });
    await insertTestOrder({ channel: "facebook", status: "delivered", totalCents: 10_000, createdAt: NOW });

    const stats = await getChannelStats({ from: at("2026-10-01T00:00:00Z"), to: NOW });
    const by = Object.fromEntries(stats.map((s) => [s.channel, s]));
    expect(by.facebook).toEqual({ channel: "facebook", orders: 4, paidOrders: 3, revenueCents: 400, avgOrderCents: 200 });
    expect(by.tiktok).toEqual({ channel: "tiktok", orders: 3, paidOrders: 2, revenueCents: 250, avgOrderCents: 250 });
    expect(by.other).toEqual({ channel: "other", orders: 1, paidOrders: 1, revenueCents: 50, avgOrderCents: 50 });
    expect(by.direct!.orders).toBe(0);
  });
});

describe("getDailyRevenue (Asia/Phnom_Penh buckets)", () => {
  it("buckets by local day, zero-fills and ends today", async () => {
    // 16:59 UTC on the 12th is 23:59 local on the 12th; 17:00 UTC is 00:00 local on the 13th.
    await insertTestOrder({ status: "delivered", totalCents: 100, createdAt: at("2026-10-12T16:59:00Z") });
    await insertTestOrder({ status: "delivered", totalCents: 200, createdAt: at("2026-10-12T17:00:00Z") });
    await insertTestOrder({ status: "paid", totalCents: 300, createdAt: at("2026-10-13T02:00:00Z") });
    await insertTestOrder({ status: "pending_payment", totalCents: 999, createdAt: at("2026-10-13T02:30:00Z") });
    await insertTestOrder({ status: "refunded", totalCents: 999, createdAt: at("2026-10-13T02:30:00Z") });
    // 14 days ago local is outside a 14-day window ending today.
    await insertTestOrder({ status: "delivered", totalCents: 5000, createdAt: at("2026-09-29T05:00:00Z") });
    await insertTestOrder({ status: "delivered", totalCents: 400, createdAt: at("2026-09-30T05:00:00Z") });

    const days = await getDailyRevenue(14, NOW);
    expect(days).toHaveLength(14);
    expect(days[0]!.date).toBe("2026-09-30");
    expect(days.at(-1)!.date).toBe("2026-10-13");
    const by = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(by["2026-09-30"]).toEqual({ date: "2026-09-30", revenueCents: 400, paidOrders: 1, orders: 1 });
    expect(by["2026-10-12"]).toEqual({ date: "2026-10-12", revenueCents: 100, paidOrders: 1, orders: 1 });
    expect(by["2026-10-13"]).toEqual({ date: "2026-10-13", revenueCents: 500, paidOrders: 3, orders: 4 });
    expect(by["2026-10-05"]).toEqual({ date: "2026-10-05", revenueCents: 0, paidOrders: 0, orders: 0 });
  });
});

describe("getDashboardKpis", () => {
  it("computes today / 7d / 30d revenue, queue counts and conversion", async () => {
    // Today (local): from 2026-10-12T17:00Z.
    await insertTestOrder({ status: "processing", totalCents: 150, createdAt: at("2026-10-12T17:30:00Z") });
    await insertTestOrder({ status: "paid", totalCents: 250, createdAt: at("2026-10-13T01:00:00Z") });
    await insertTestOrder({ status: "pending_payment", totalCents: 999, createdAt: at("2026-10-13T02:00:00Z") });
    // Yesterday local.
    await insertTestOrder({ status: "delivered", totalCents: 1000, createdAt: at("2026-10-12T16:00:00Z") });
    await insertTestOrder({ status: "failed", totalCents: 400, createdAt: at("2026-10-12T10:00:00Z") });
    // 10 days ago: in 30d, not in 7d.
    await insertTestOrder({ status: "delivered", totalCents: 2000, createdAt: at("2026-10-03T05:00:00Z") });
    await insertTestOrder({ status: "expired", totalCents: 2000, createdAt: at("2026-10-03T05:00:00Z") });
    // 40 days ago: outside, but still waiting for delivery (queues are all-time).
    await insertTestOrder({ status: "paid", totalCents: 5000, createdAt: at("2026-09-03T05:00:00Z") });

    const k = await getDashboardKpis(NOW);
    expect(k.revenueTodayCents).toBe(400);
    expect(k.revenue7dCents).toBe(1400);
    expect(k.revenue30dCents).toBe(3400);
    expect(k.paidOrdersToday).toBe(2);
    expect(k.awaitingDelivery).toBe(3);
    expect(k.failed).toBe(1);
    expect(k.conversion7d).toEqual({ created: 5, paid: 4, rate: 0.8 });
  });

  it("has no conversion rate without orders", async () => {
    const k = await getDashboardKpis(NOW);
    expect(k.conversion7d).toEqual({ created: 0, paid: 0, rate: null });
    expect(k.revenueTodayCents).toBe(0);
  });
});

describe("top games and queues", () => {
  it("ranks games by revenue using the latest snapshot name", async () => {
    const t = at("2026-10-10T05:00:00Z");
    await insertTestOrder({ gameSlug: "free-fire", gameName: "Free Fire (old)", status: "delivered", totalCents: 100, createdAt: t });
    await insertTestOrder({ gameSlug: "free-fire", gameName: "Free Fire", status: "delivered", totalCents: 900, createdAt: at("2026-10-11T05:00:00Z") });
    await insertTestOrder({ gameSlug: "mobile-legends", status: "processing", totalCents: 500, createdAt: t });
    await insertTestOrder({ gameSlug: "pubg-mobile", gameName: "PUBG Mobile", status: "failed", totalCents: 9000, createdAt: t });

    const top = await getTopGames({ from: at("2026-10-01T00:00:00Z"), to: NOW });
    expect(top).toEqual([
      { gameSlug: "free-fire", gameName: "Free Fire", paidOrders: 2, revenueCents: 1000 },
      { gameSlug: "mobile-legends", gameName: "Mobile Legends: Bang Bang", paidOrders: 1, revenueCents: 500 },
    ]);
  });

  it("lists orders needing action, longest waiting first", async () => {
    const a = await insertTestOrder({ status: "processing", paidAt: at("2026-10-13T01:00:00Z") });
    const b = await insertTestOrder({ status: "failed", paidAt: at("2026-10-12T01:00:00Z") });
    const c = await insertTestOrder({ status: "paid", paidAt: at("2026-10-13T02:00:00Z") });
    await insertTestOrder({ status: "delivered", paidAt: at("2026-10-11T01:00:00Z") });
    await insertTestOrder({ status: "pending_payment" });

    const queue = await getNeedsDelivery();
    expect(queue.map((o) => o.id)).toEqual([b.id, a.id, c.id]);
    expect(await countOrdersNeedingAction()).toBe(3);
  });

  it("lists recent orders newest first", async () => {
    const old = await insertTestOrder({ createdAt: at("2026-10-01T00:00:00Z") });
    const recent = await insertTestOrder({ createdAt: at("2026-10-13T00:00:00Z") });
    expect((await getRecentOrders(5)).map((o) => o.id)).toEqual([recent.id, old.id]);
  });
});
