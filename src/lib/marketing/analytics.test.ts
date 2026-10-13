import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { promoCodes, type NewPromoCode } from "@/db/schema";
import { insertTestOrder } from "@/lib/admin/test-orders";
import { lastDaysWindow } from "@/lib/admin/time";
import { resetDb } from "../../../tests/helpers/db";
import { getChannelPerformance, getPromoUsageByChannel, getTopCampaigns, parsePeriod } from "./analytics";

// 2026-10-13 10:00 in Phnom Penh (03:00 UTC). 7-day window starts 2026-10-06 17:00 UTC.
const NOW = new Date("2026-10-13T03:00:00Z");
const INSIDE = new Date("2026-10-12T05:00:00Z");
const OLD = new Date("2026-09-20T05:00:00Z"); // inside 30 days, outside 7

const code = (over: Partial<NewPromoCode> & { code: string }): NewPromoCode => ({
  type: "percent",
  value: 5,
  maxDiscountCents: 200,
  active: true,
  ...over,
});

beforeEach(async () => {
  await resetDb();
});

describe("parsePeriod", () => {
  it("accepts 7 / 30 / 90 and defaults to 30", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod(["90"])).toBe(90);
    expect(parsePeriod("365")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });
});

describe("getChannelPerformance", () => {
  it("computes per-channel and total orders, paid, revenue, AOV, conversion and share", async () => {
    await insertTestOrder({ channel: "facebook", status: "delivered", totalCents: 300, createdAt: INSIDE });
    await insertTestOrder({ channel: "facebook", status: "paid", totalCents: 100, createdAt: INSIDE });
    await insertTestOrder({ channel: "facebook", status: "expired", totalCents: 999, createdAt: INSIDE });
    await insertTestOrder({ channel: "facebook", status: "pending_payment", totalCents: 999, createdAt: INSIDE });
    await insertTestOrder({ channel: "tiktok", status: "delivered", totalCents: 600, createdAt: INSIDE });
    // Paid but refunded: counts as paid, not revenue.
    await insertTestOrder({ channel: "tiktok", status: "refunded", totalCents: 500, createdAt: INSIDE });
    await insertTestOrder({ channel: "direct", status: "cancelled", totalCents: 100, createdAt: INSIDE });
    await insertTestOrder({ channel: "facebook", status: "delivered", totalCents: 10_000, createdAt: OLD });

    const p = await getChannelPerformance(7, NOW);
    expect(p.days).toBe(7);
    expect(p.window).toEqual(lastDaysWindow(7, NOW));
    const by = Object.fromEntries(p.rows.map((r) => [r.channel, r]));
    expect(by.facebook).toMatchObject({ orders: 4, paidOrders: 2, revenueCents: 400, avgOrderCents: 200, conversionRate: 0.5 });
    expect(by.tiktok).toMatchObject({ orders: 2, paidOrders: 2, revenueCents: 600, avgOrderCents: 600, conversionRate: 1 });
    expect(by.direct).toMatchObject({ orders: 1, paidOrders: 0, revenueCents: 0, conversionRate: 0 });
    expect(by.telegram).toMatchObject({ orders: 0, conversionRate: null, revenueShare: 0 });
    expect(by.facebook!.revenueShare).toBeCloseTo(0.4);
    expect(by.tiktok!.revenueShare).toBeCloseTo(0.6);
    expect(p.totals).toEqual({ orders: 7, paidOrders: 4, revenueCents: 1000, avgOrderCents: 333, conversionRate: 4 / 7 });

    const month = await getChannelPerformance(30, NOW);
    expect(month.totals.revenueCents).toBe(11_000);
  });

  it("returns zeros on an empty database", async () => {
    const p = await getChannelPerformance(30, NOW);
    expect(p.rows).toHaveLength(6);
    expect(p.totals).toEqual({ orders: 0, paidOrders: 0, revenueCents: 0, avgOrderCents: 0, conversionRate: null });
  });
});

describe("getPromoUsageByChannel", () => {
  it("groups code usage by the code's channel and lists unused live channel codes", async () => {
    await db.insert(promoCodes).values([
      code({ code: "FB5", channel: "facebook" }),
      code({ code: "FOLLOW10", channel: "facebook", value: 10 }),
      code({ code: "TIKTOK5", channel: "tiktok" }),
      code({ code: "TG5", channel: "telegram" }),
      code({ code: "OLDTG", channel: "telegram", active: false }),
      code({ code: "WELCOME5", channel: null }),
    ]);
    const window = lastDaysWindow(30, NOW);
    await insertTestOrder({ promoCode: "FB5", channel: "facebook", status: "delivered", totalCents: 285, discountCents: 15, createdAt: INSIDE });
    await insertTestOrder({ promoCode: "FB5", channel: "direct", status: "pending_payment", totalCents: 95, discountCents: 5, createdAt: INSIDE });
    await insertTestOrder({ promoCode: "FOLLOW10", channel: "facebook", status: "processing", totalCents: 900, discountCents: 100, createdAt: INSIDE });
    await insertTestOrder({ promoCode: "WELCOME5", channel: "direct", status: "delivered", totalCents: 190, discountCents: 10, createdAt: INSIDE });
    // Code deleted since: orders keep the code text.
    await insertTestOrder({ promoCode: "GONE", channel: "other", status: "delivered", totalCents: 50, discountCents: 50, createdAt: INSIDE });
    // Outside the window.
    await insertTestOrder({ promoCode: "TIKTOK5", channel: "tiktok", status: "delivered", totalCents: 1000, createdAt: new Date("2026-08-01T00:00:00Z") });
    // No code.
    await insertTestOrder({ channel: "facebook", status: "delivered", totalCents: 500, createdAt: INSIDE });

    const groups = await getPromoUsageByChannel(window);
    expect(groups.map((g) => g.promoChannel)).toEqual(["facebook", "tiktok", "telegram", "none"]);

    const fb = groups[0]!;
    expect(fb).toMatchObject({ orders: 3, paidOrders: 2, revenueCents: 1185, discountCents: 115 });
    expect(fb.codes.map((c) => [c.code, c.orders, c.paidOrders, c.revenueCents, c.discountCents])).toEqual([
      ["FOLLOW10", 1, 1, 900, 100],
      ["FB5", 2, 1, 285, 15],
    ]);
    // Live channel code with no orders in the window still shows (zero row); inactive ones do not.
    expect(groups[1]!.codes).toEqual([
      { code: "TIKTOK5", promoChannel: "tiktok", active: true, orders: 0, paidOrders: 0, revenueCents: 0, discountCents: 0 },
    ]);
    expect(groups[2]!.codes.map((c) => c.code)).toEqual(["TG5"]);
    const none = groups[3]!;
    expect(none.codes.map((c) => [c.code, c.active])).toEqual([
      ["WELCOME5", true],
      ["GONE", null],
    ]);
  });
});

describe("getTopCampaigns", () => {
  it("ranks utm campaigns by revenue within the window", async () => {
    await insertTestOrder({ channel: "tiktok", utmSource: "tiktok", utmCampaign: "bio", status: "delivered", totalCents: 300, createdAt: INSIDE });
    await insertTestOrder({ channel: "tiktok", utmSource: "tiktok", utmCampaign: "bio", status: "expired", totalCents: 300, createdAt: INSIDE });
    await insertTestOrder({ channel: "facebook", utmSource: "facebook", utmCampaign: "free-fire", status: "delivered", totalCents: 1000, createdAt: INSIDE });
    await insertTestOrder({ channel: "facebook", utmSource: "messenger", utmCampaign: "instant_reply", status: "paid", totalCents: 100, createdAt: INSIDE });
    await insertTestOrder({ channel: "facebook", utmSource: "facebook", utmCampaign: "old", status: "delivered", totalCents: 9999, createdAt: OLD });
    await insertTestOrder({ channel: "direct", status: "delivered", totalCents: 5000, createdAt: INSIDE });

    const top = await getTopCampaigns(lastDaysWindow(7, NOW), 10);
    expect(top).toEqual([
      { channel: "facebook", source: "facebook", campaign: "free-fire", orders: 1, paidOrders: 1, revenueCents: 1000 },
      { channel: "tiktok", source: "tiktok", campaign: "bio", orders: 2, paidOrders: 1, revenueCents: 300 },
      { channel: "facebook", source: "messenger", campaign: "instant_reply", orders: 1, paidOrders: 1, revenueCents: 100 },
    ]);
    expect(await getTopCampaigns(lastDaysWindow(7, NOW), 1)).toHaveLength(1);
  });
});
