import { randomUUID } from "node:crypto";
import { BakongKHQR } from "bakong-khqr";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { games, orderEvents, orders, promoCodes, type Order } from "@/db/schema";

vi.mock("@/lib/notify", () => ({
  notifyOrderPaid: vi.fn(async () => {}),
  notifyOrderStatusChanged: vi.fn(async () => {}),
}));
vi.mock("@/lib/payments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments")>();
  return { ...actual, checkPayment: vi.fn(actual.checkPayment) };
});
vi.mock("@/lib/orders/code", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orders/code")>();
  return { ...actual, generateOrderCode: vi.fn(actual.generateOrderCode) };
});

import { getGameBySlug } from "@/lib/catalog";
import { generateOrderCode } from "@/lib/orders/code";
import { resetEnvCache } from "@/lib/env";
import { startFulfillment } from "@/lib/fulfillment";
import { notifyOrderPaid, notifyOrderStatusChanged } from "@/lib/notify";
import { toPublicOrder } from "@/lib/orders/public";
import {
  addOrderNote,
  cancelOrder,
  createOrder,
  expireStaleOrders,
  getOrderByCode,
  getOrderById,
  linkCustomerTelegram,
  listOrderEvents,
  markOrderDelivered,
  markOrderFailed,
  markOrderPaid,
  markOrderProcessing,
  markOrderRefunded,
  OrderError,
  reconcilePendingPayments,
  refreshOrderPayment,
  type CreateOrderContext,
  type CreateOrderInput,
} from "@/lib/orders/service";
import { checkPayment } from "@/lib/payments";
import { mockNickname } from "@/lib/players/lookup";
import { resetDb, seedCatalog } from "../helpers/db";

const check = vi.mocked(checkPayment);
const PAID = { status: "paid" as const, ref: "BAKONGHASH1", payload: { responseCode: 0 } };

async function weeklyPass() {
  const game = (await getGameBySlug("mobile-legends"))!;
  return { game, pkg: game.packages.find((p) => p.name === "Weekly Diamond Pass")! }; // $1.45
}

async function newOrder(input: Partial<CreateOrderInput> = {}, ctx: CreateOrderContext = {}): Promise<Order> {
  const { pkg } = await weeklyPass();
  return createOrder(
    { gameSlug: "mobile-legends", packageId: pkg.id, playerId: "123456789", zoneId: "1234", ...input },
    ctx,
  );
}

async function events(orderId: string, type?: string) {
  const rows = await listOrderEvents(orderId);
  return type ? rows.filter((e) => e.type === type) : rows;
}

async function expectOrderError(p: Promise<unknown>, code: string, status = 400) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(OrderError);
  expect(err).toMatchObject({ code, status });
}

function setEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  resetEnvCache();
}

beforeEach(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {}); // seed progress output
  await seedCatalog();
  log.mockRestore();
  vi.clearAllMocks();
  check.mockResolvedValue({ status: "unpaid" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
  vi.restoreAllMocks();
});

describe("createOrder", () => {
  it("creates a priced pending order with a KHQR and a created event", async () => {
    const before = Date.now();
    const order = await newOrder(
      { playerId: " 123 456 789 ", promoCode: " tiktok5 ", contactTelegram: "@khmer_gamer", playerName: "Forged" },
      { locale: "km", ipHash: "iphash", userAgent: "Mozilla/5.0 (iPhone) TikTok" },
    );

    expect(order.code).toMatch(/^SK[2-9A-HJKMNP-Z]{8}$/);
    expect(order.status).toBe("pending_payment");
    expect(order).toMatchObject({
      gameSlug: "mobile-legends",
      packageName: "Weekly Diamond Pass",
      playerId: "123456789",
      zoneId: "1234",
      // Server-side lookup wins over the client-provided name.
      playerName: mockNickname("123456789"),
      unitPriceCents: 145,
      discountCents: 7, // 5% of 145, rounded down
      totalCents: 138,
      promoCode: "TIKTOK5",
      currency: "USD",
      contactTelegram: "khmer_gamer",
      locale: "km",
      ipHash: "iphash",
      userAgent: "Mozilla/5.0 (iPhone) TikTok",
      // Direct visit + TikTok promo code → attributed to TikTok.
      channel: "tiktok",
    });

    expect(BakongKHQR.verify(order.khqr!).isValid).toBe(true);
    const decoded = BakongKHQR.decode(order.khqr!).data!;
    expect(decoded.transactionAmount).toBe("1.38");
    expect(decoded.billNumber).toBe(order.code);
    expect(order.khqrMd5).toMatch(/^[a-f0-9]{32}$/);
    const expiresIn = order.paymentExpiresAt!.getTime() - before;
    expect(expiresIn).toBeGreaterThanOrEqual(15 * 60_000 - 1000);
    expect(expiresIn).toBeLessThanOrEqual(15 * 60_000 + 5000);

    const created = await events(order.id);
    expect(created.map((e) => e.type)).toEqual(["created"]);
    expect(created[0]!.actor).toBe("customer");

    // usedCount only moves when the order is paid.
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, "TIKTOK5"));
    expect(promo!.usedCount).toBe(0);
  });

  it("stores attribution and prefers it over the promo's channel", async () => {
    const order = await newOrder(
      { promoCode: "TIKTOK5" },
      {
        attribution: {
          utmSource: "facebook",
          utmMedium: "social",
          utmCampaign: "pchum-ben",
          clickId: "fbclid123",
          referrer: "https://m.facebook.com/",
          landingPath: "/games/mobile-legends?utm_source=facebook",
        },
      },
    );
    expect(order).toMatchObject({
      channel: "facebook",
      utmSource: "facebook",
      utmMedium: "social",
      utmCampaign: "pchum-ben",
      clickId: "fbclid123",
      referrer: "https://m.facebook.com/",
      landingPath: "/games/mobile-legends?utm_source=facebook",
    });
    expect((await newOrder()).channel).toBe("direct");
  });

  it("rejects unknown/inactive games and packages", async () => {
    const { game, pkg } = await weeklyPass();
    const ff = (await getGameBySlug("free-fire"))!;
    await expectOrderError(newOrder({ gameSlug: "nope" }), "game_not_found");
    await expectOrderError(newOrder({ packageId: ff.packages[0]!.id }), "package_not_found");
    await expectOrderError(newOrder({ packageId: 999_999 }), "package_not_found");

    await db.update(games).set({ active: false }).where(eq(games.id, game.id));
    await expectOrderError(
      createOrder({ gameSlug: "mobile-legends", packageId: pkg.id, playerId: "123456789", zoneId: "1234" }),
      "game_not_found",
    );
  });

  it("validates player id and zone", async () => {
    await expectOrderError(newOrder({ playerId: "abc" }), "invalid_id");
    await expectOrderError(newOrder({ zoneId: null }), "invalid_zone");
    await expectOrderError(newOrder({ zoneId: "1" }), "invalid_zone");
    // Mock lookup says this account does not exist.
    await expectOrderError(newOrder({ playerId: "123456000" }), "invalid_id");

    const genshin = (await getGameBySlug("genshin-impact"))!;
    const base = { gameSlug: "genshin-impact", packageId: genshin.packages[0]!.id, playerId: "812345678" };
    await expectOrderError(createOrder({ ...base, zoneId: "os_mars" }, {}), "invalid_zone");
    expect((await createOrder({ ...base, zoneId: "os_asia" }, {})).zoneId).toBe("os_asia");
  });

  it("maps every promo error to promo_<error>", async () => {
    const ff = (await getGameBySlug("free-fire"))!;
    const day = 24 * 60 * 60_000;
    await db.insert(promoCodes).values([
      { code: "OFF", type: "percent", value: 10, active: false },
      { code: "SOON", type: "percent", value: 10, startsAt: new Date(Date.now() + day) },
      { code: "OVER", type: "percent", value: 10, endsAt: new Date(Date.now() - day) },
      { code: "GONE", type: "fixed", value: 10, maxUses: 1, usedCount: 1 },
      { code: "FFONLY", type: "fixed", value: 10, gameId: ff.id },
    ]);
    await expectOrderError(newOrder({ promoCode: "NOPE" }), "promo_not_found");
    await expectOrderError(newOrder({ promoCode: "off" }), "promo_inactive");
    await expectOrderError(newOrder({ promoCode: "SOON" }), "promo_not_started");
    await expectOrderError(newOrder({ promoCode: "OVER" }), "promo_expired");
    await expectOrderError(newOrder({ promoCode: "GONE" }), "promo_used_up");
    await expectOrderError(newOrder({ promoCode: "FOLLOW10" }), "promo_min_order"); // min $5
    await expectOrderError(newOrder({ promoCode: "FFONLY" }), "promo_not_applicable");
    expect((await newOrder({ promoCode: "" })).promoCode).toBeNull();
  });

  it("retries with a new code when the generated code already exists", async () => {
    const first = await newOrder();
    vi.mocked(generateOrderCode).mockReturnValueOnce(first.code);
    const second = await newOrder();
    expect(generateOrderCode).toHaveBeenCalledTimes(3); // first order, duplicate, retry
    expect(second.code).not.toBe(first.code);
    expect(BakongKHQR.decode(second.khqr!).data!.billNumber).toBe(second.code);
    expect(await db.select().from(orders)).toHaveLength(2);
  });

  it("fails with payment_unavailable when KHQR cannot be built", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setEnv({ PAYMENT_MODE: "bakong", BAKONG_ACCOUNT_ID: "" });
    await expectOrderError(newOrder(), "payment_unavailable", 503);
    expect(await db.select().from(orders)).toHaveLength(0);
  });
});

describe("markOrderPaid", () => {
  it("is idempotent under concurrency", async () => {
    const order = await newOrder({ promoCode: "TIKTOK5" });
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => markOrderPaid(order.id, { ref: `REF${i}`, actor: "system" })),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await events(order.id, "paid")).toHaveLength(1);
    expect(await events(order.id, "processing")).toHaveLength(1);
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, "TIKTOK5"));
    expect(promo!.usedCount).toBe(1);
    expect(notifyOrderPaid).toHaveBeenCalledTimes(1);
    const saved = (await getOrderById(order.id))!;
    expect(saved.paidAt).toBeInstanceOf(Date);
    expect(saved.paymentRef).toMatch(/^REF\d$/);
  });

  it("accepts a late payment for an expired order", async () => {
    const order = await newOrder();
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 10 * 60_000) })
      .where(eq(orders.id, order.id));
    expect(await expireStaleOrders()).toBe(1);
    expect((await getOrderById(order.id))!.status).toBe("expired");

    const paid = await markOrderPaid(order.id, { ref: "LATE1", payload: { x: 1 }, actor: "system" });
    expect(paid?.status).toBe("processing");
    const [paidEvent] = await events(order.id, "paid");
    expect(paidEvent!.message).toMatch(/late payment/i);
    expect((await getOrderById(order.id))!.paymentPayload).toEqual({ x: 1 });
  });

  it("returns null for unknown ids", async () => {
    expect(await markOrderPaid("not-a-uuid", { actor: "admin" })).toBeNull();
    expect(await markOrderPaid(randomUUID(), { actor: "admin" })).toBeNull();
  });
});

describe("status transitions", () => {
  it("rejects invalid transitions with null and no side effects", async () => {
    const order = await newOrder();
    expect(await markOrderProcessing(order.id, { actor: "admin" })).toBeNull();
    expect(await markOrderDelivered(order.id, { actor: "admin" })).toBeNull();
    expect(await markOrderFailed(order.id, { actor: "admin", reason: "x" })).toBeNull();
    expect(await markOrderRefunded(order.id, { actor: "admin" })).toBeNull();
    expect(notifyOrderStatusChanged).not.toHaveBeenCalled();

    await markOrderPaid(order.id, { actor: "admin" });
    expect(await cancelOrder(order.id, { actor: "customer" })).toBeNull();
    expect(await markOrderPaid(order.id, { actor: "admin" })).toBeNull();

    const failed = await markOrderFailed(order.id, { actor: "admin", reason: "Wrong server" });
    expect(failed?.status).toBe("failed");
    const retried = await markOrderProcessing(order.id, { actor: "telegram", message: "Retrying" });
    expect(retried?.status).toBe("processing");
    const delivered = await markOrderDelivered(order.id, { actor: "telegram" });
    expect(delivered?.status).toBe("delivered");
    expect(delivered?.deliveredAt).toBeInstanceOf(Date);
    expect(await markOrderProcessing(order.id, { actor: "admin" })).toBeNull();
    expect(await markOrderDelivered(order.id, { actor: "admin" })).toBeNull();

    const refunded = await markOrderRefunded(order.id, { actor: "admin", message: "Customer request" });
    expect(refunded?.status).toBe("refunded");
    expect(await markOrderDelivered(order.id, { actor: "admin" })).toBeNull();
    expect(notifyOrderStatusChanged).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "refunded" }),
      "delivered",
    );

    const types = (await events(order.id)).map((e) => e.type);
    expect(types).toEqual(["created", "paid", "processing", "failed", "processing", "delivered", "refunded"]);
  });

  it("cancels pending orders only", async () => {
    const order = await newOrder();
    const cancelled = await cancelOrder(order.id, { actor: "customer" });
    expect(cancelled?.status).toBe("cancelled");
    expect(notifyOrderStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
      "pending_payment",
    );
    expect(await cancelOrder(order.id, { actor: "customer" })).toBeNull();
    expect(await markOrderPaid(order.id, { actor: "system" })).toBeNull();
  });

  it("re-checks Bakong before cancelling in bakong mode", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setEnv({ PAYMENT_MODE: "bakong" });
    const paidMeanwhile = await newOrder();
    check.mockResolvedValueOnce(PAID);
    expect(await cancelOrder(paidMeanwhile.id, { actor: "customer" })).toBeNull();
    expect((await getOrderById(paidMeanwhile.id))!.status).toBe("processing");

    const unknown = await newOrder();
    check.mockResolvedValueOnce({ status: "error", message: "Bakong down" });
    expect(await cancelOrder(unknown.id, { actor: "customer" })).toBeNull();
    expect((await getOrderById(unknown.id))!.status).toBe("pending_payment");

    const unpaid = await newOrder();
    expect((await cancelOrder(unpaid.id, { actor: "customer" }))?.status).toBe("cancelled");
  });
});

describe("fulfillment", () => {
  it("manual mode waits for the admin", async () => {
    const order = await newOrder();
    const result = await markOrderPaid(order.id, { actor: "system" });
    expect(result?.status).toBe("processing");
    const [processing] = await events(order.id, "processing");
    expect(processing!.message).toBe("Waiting for admin to deliver");
    expect(notifyOrderPaid).toHaveBeenCalledWith(expect.objectContaining({ status: "paid" }));
    expect(notifyOrderStatusChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "processing" }), "paid");
  });

  it("mock mode delivers immediately", async () => {
    setEnv({ FULFILLMENT_MODE: "mock" });
    const order = await newOrder();
    const result = await markOrderPaid(order.id, { actor: "system" });
    expect(result?.status).toBe("delivered");
    expect(result?.deliveredAt).toBeInstanceOf(Date);
    expect((await events(order.id)).map((e) => e.type)).toEqual(["created", "paid", "processing", "delivered"]);
  });

  it("never throws and reports the current state", async () => {
    const order = await newOrder();
    const paid = (await markOrderPaid(order.id, { actor: "system" }))!;
    // Already processing: nothing to do, returns the latest order.
    expect((await startFulfillment(paid)).status).toBe("processing");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bogus = { ...paid, id: "not-a-uuid" };
    await expect(startFulfillment(bogus)).resolves.toBe(bogus);
  });
});

describe("refreshOrderPayment", () => {
  it("throttles provider checks per order and marks paid when confirmed", async () => {
    const order = await newOrder();
    await Promise.all([refreshOrderPayment(order), refreshOrderPayment(order), refreshOrderPayment(order)]);
    expect(check).toHaveBeenCalledTimes(1);
    await refreshOrderPayment(order);
    expect(check).toHaveBeenCalledTimes(1);

    await db
      .update(orders)
      .set({ lastPaymentCheckAt: new Date(Date.now() - 5_000) })
      .where(eq(orders.id, order.id));
    check.mockResolvedValueOnce(PAID);
    const refreshed = await refreshOrderPayment(order);
    expect(check).toHaveBeenCalledTimes(2);
    expect(refreshed.status).toBe("processing");
    expect(refreshed.paymentRef).toBe("BAKONGHASH1");
    expect((await getOrderById(order.id))!.paymentPayload).toEqual({ responseCode: 0 });
  });

  it("does one final check after the window closes, then expires", async () => {
    const order = await newOrder();
    const now = Date.now();
    // Last check ran just before expiry (inside the 4s throttle) — a final check must still happen.
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(now - 1_000), lastPaymentCheckAt: new Date(now - 2_000) })
      .where(eq(orders.id, order.id));
    const stale = (await getOrderById(order.id))!;
    const result = await refreshOrderPayment(stale);
    expect(check).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("expired");
    expect(result.khqr).toBeTruthy();
    expect(toPublicOrder(result).khqr).toBeNull();
    expect(notifyOrderStatusChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "expired" }), "pending_payment");
    // Non-pending orders are returned untouched.
    expect(await refreshOrderPayment(result)).toBe(result);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("prefers a payment found in the final check over expiring", async () => {
    const order = await newOrder();
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 1_000) })
      .where(eq(orders.id, order.id));
    check.mockResolvedValueOnce(PAID);
    const result = await refreshOrderPayment((await getOrderById(order.id))!);
    expect(result.status).toBe("processing");
    expect(await events(order.id, "expired")).toHaveLength(0);
  });
});

describe("cron jobs", () => {
  it("expireStaleOrders expires only orders past their window (+ grace)", async () => {
    const stale = await newOrder();
    const fresh = await newOrder();
    const justClosed = await newOrder();
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 5 * 60_000) })
      .where(eq(orders.id, stale.id));
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 10_000) })
      .where(eq(orders.id, justClosed.id));

    expect(await expireStaleOrders()).toBe(1);
    expect((await getOrderById(stale.id))!.status).toBe("expired");
    expect((await getOrderById(fresh.id))!.status).toBe("pending_payment");
    expect((await getOrderById(justClosed.id))!.status).toBe("pending_payment");
    expect(await events(stale.id, "expired")).toHaveLength(1);
    expect(notifyOrderStatusChanged).toHaveBeenCalledWith(expect.objectContaining({ id: stale.id }), "pending_payment");
    expect(await expireStaleOrders()).toBe(0);
    expect(await expireStaleOrders(new Date(), 0)).toBe(1);
  });

  it("reconcilePendingPayments catches unpolled and late payments, throttled", async () => {
    const paidPending = await newOrder();
    const unpaid = await newOrder();
    const late = await newOrder();
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 60 * 60_000) })
      .where(eq(orders.id, late.id));
    await expireStaleOrders();
    const tooOld = await newOrder();
    await db
      .update(orders)
      .set({ status: "expired", paymentExpiresAt: new Date(Date.now() - 48 * 60 * 60_000) })
      .where(eq(orders.id, tooOld.id));

    check.mockImplementation(async (o) => ([paidPending.code, late.code].includes(o.code) ? PAID : { status: "unpaid" }));
    expect(await reconcilePendingPayments()).toEqual({ checked: 3, paid: 2 });
    expect((await getOrderById(paidPending.id))!.status).toBe("processing");
    expect((await getOrderById(late.id))!.status).toBe("processing");
    expect((await getOrderById(unpaid.id))!.status).toBe("pending_payment");
    expect((await getOrderById(tooOld.id))!.status).toBe("expired");

    // Everything was just checked: nothing to do on an immediate re-run.
    expect(await reconcilePendingPayments()).toEqual({ checked: 0, paid: 0 });
  });
});

describe("telegram link, notes and lookups", () => {
  it("links the customer's Telegram chat idempotently", async () => {
    const order = await newOrder();
    const linked = await linkCustomerTelegram(order.code.toLowerCase(), "123456789");
    expect(linked?.customerTelegramChatId).toBe("123456789");
    await linkCustomerTelegram(order.code, "123456789");
    expect(await events(order.id, "notify")).toHaveLength(1);
    expect(toPublicOrder(linked!).telegramLinked).toBe(true);

    expect(await linkCustomerTelegram("SKNOPE2345", "1")).toBeNull();
    expect(await linkCustomerTelegram(order.code, "not-a-chat")).toBeNull();
  });

  it("keeps admin notes off the public timeline", async () => {
    const order = await newOrder();
    await addOrderNote(order.id, { actor: "admin", message: "  Called the customer  " });
    await addOrderNote(order.id, { actor: "admin", message: "   " });
    const notes = await events(order.id, "note");
    expect(notes).toHaveLength(1);
    expect(notes[0]!.message).toBe("Called the customer");
    const pub = toPublicOrder(order, await listOrderEvents(order.id));
    expect(pub.timeline.map((e) => e.type)).toEqual(["created"]);
  });

  it("finds orders by code case-insensitively", async () => {
    const order = await newOrder();
    expect((await getOrderByCode(` ${order.code.toLowerCase()} `))?.id).toBe(order.id);
    expect(await getOrderByCode("garbage")).toBeNull();
    expect(await getOrderById("garbage")).toBeNull();
    const rows = await db
      .select()
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, order.id), eq(orderEvents.type, "created")));
    expect(rows).toHaveLength(1);
  });
});
