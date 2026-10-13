import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { orders } from "@/db/schema";

vi.mock("@/lib/notify", () => ({
  notifyOrderPaid: vi.fn(async () => {}),
  notifyOrderStatusChanged: vi.fn(async () => {}),
}));

import { GET as cronGet, POST as cronPost } from "@/app/api/cron/reconcile/route";
import { POST as cancelOrderRoute } from "@/app/api/orders/[code]/cancel/route";
import { GET as getOrderRoute } from "@/app/api/orders/[code]/route";
import { POST as simulatePayment } from "@/app/api/orders/[code]/simulate-payment/route";
import { POST as createOrderRoute } from "@/app/api/orders/route";
import { POST as lookupPlayerRoute } from "@/app/api/players/lookup/route";
import { POST as validatePromoRoute } from "@/app/api/promo/validate/route";
import { encodeAttribution } from "@/lib/attribution";
import { getGameBySlug } from "@/lib/catalog";
import { resetEnvCache } from "@/lib/env";
import type { PublicOrder } from "@/lib/orders/public";
import { mockNickname } from "@/lib/players/lookup";
import { resetRateLimits } from "@/lib/rate-limit";
import { hashIp } from "@/lib/request";
import { resetDb, seedCatalog } from "../helpers/db";

let ipCounter = 0;
/** Unique client IP per test so rate limits don't leak between tests. */
let ip = "203.0.113.1";

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000${path}`, { headers: { "x-forwarded-for": ip, ...headers } });
}

const params = (code: string) => ({ params: Promise.resolve({ code }) });

async function orderBody(overrides: Record<string, unknown> = {}) {
  const game = (await getGameBySlug("mobile-legends"))!;
  const pkg = game.packages.find((p) => p.name === "Weekly Diamond Pass")!;
  return { gameSlug: "mobile-legends", packageId: pkg.id, playerId: "123456789", zoneId: "1234", ...overrides };
}

async function createViaApi(overrides: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const res = await createOrderRoute(post("/api/orders", await orderBody(overrides), headers));
  expect(res.status).toBe(201);
  return ((await res.json()) as { order: PublicOrder }).order;
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
  resetRateLimits();
  ip = `203.0.113.${++ipCounter}`;
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
  vi.restoreAllMocks();
});

describe("POST /api/orders", () => {
  it("creates an order and stores attribution from the sk_attr cookie", async () => {
    const attr = encodeAttribution({
      utmSource: "tiktok",
      utmMedium: "video",
      utmCampaign: "khmer-new-year",
      clickId: "E.C.P.ttclid",
      landingPath: "/games/mobile-legends?utm_source=tiktok&ttclid=E.C.P.ttclid",
      ts: Date.now(),
    });
    const res = await createOrderRoute(
      post("/api/orders", await orderBody({ promoCode: "fb5" }), {
        cookie: `sk_lang=km; sk_attr=${attr}; other=1`,
        "user-agent": "Mozilla/5.0 (Linux; Android 14) musical_ly_2023",
      }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { order } = (await res.json()) as { order: PublicOrder };
    expect(order).toMatchObject({
      status: "pending_payment",
      gameSlug: "mobile-legends",
      playerId: "123456789",
      zoneId: "1234",
      playerName: mockNickname("123456789"),
      unitPriceCents: 145,
      discountCents: 7,
      totalCents: 138,
      promoCode: "FB5",
      currency: "USD",
      paymentMode: "mock",
    });
    expect(order.khqr).toMatch(/^000201/);
    expect(order.timeline.map((e) => e.type)).toEqual(["created"]);
    expect(order).not.toHaveProperty("ipHash");

    const [row] = await db.select().from(orders).where(eq(orders.code, order.code));
    // Attribution (TikTok) wins over the Facebook promo code's channel.
    expect(row).toMatchObject({
      channel: "tiktok",
      utmSource: "tiktok",
      utmMedium: "video",
      utmCampaign: "khmer-new-year",
      clickId: "E.C.P.ttclid",
      locale: "km",
      ipHash: hashIp(ip),
      userAgent: "Mozilla/5.0 (Linux; Android 14) musical_ly_2023",
    });
  });

  it("also reads a cookie value that was URI-encoded twice", async () => {
    const attr = encodeURIComponent(encodeAttribution({ utmSource: "facebook" }));
    const order = await createViaApi({}, { cookie: `sk_attr=${attr}` });
    const [row] = await db.select().from(orders).where(eq(orders.code, order.code));
    expect(row!.channel).toBe("facebook");
  });

  it("returns stable error codes", async () => {
    const send = async (body: unknown) => {
      const res = await createOrderRoute(post("/api/orders", body));
      return { status: res.status, body: (await res.json()) as { error: string; field?: string } };
    };
    expect(await send("{not json")).toEqual({ status: 400, body: { error: "invalid_request" } });
    expect((await send({ ...(await orderBody()), playerId: "" })).body).toEqual({
      error: "invalid_id",
      field: "playerId",
    });
    expect((await send(await orderBody({ playerId: "abc" }))).body).toEqual({ error: "invalid_id", field: "playerId" });
    expect((await send(await orderBody({ zoneId: "" }))).body).toEqual({ error: "invalid_zone", field: "zoneId" });
    expect((await send(await orderBody({ gameSlug: "unknown-game" }))).body.error).toBe("game_not_found");
    expect((await send(await orderBody({ packageId: 999999 }))).body.error).toBe("package_not_found");
    const promo = await send(await orderBody({ promoCode: "FOLLOW10" }));
    expect(promo).toEqual({ status: 400, body: { error: "promo_min_order", field: "promoCode" } });
  });

  it("rejects oversized bodies, including streamed ones without Content-Length", async () => {
    const big = JSON.stringify({ ...(await orderBody()), playerName: "x".repeat(20_000) });
    const declared = await createOrderRoute(post("/api/orders", big));
    expect(declared.status).toBe(400);
    expect(await declared.json()).toEqual({ error: "invalid_request" });

    const bytes = new TextEncoder().encode(big);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 1024) controller.enqueue(bytes.slice(i, i + 1024));
        controller.close();
      },
    });
    const streamed = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect(streamed.headers.get("content-length")).toBeNull();
    const res = await createOrderRoute(streamed);
    expect(res.status).toBe(400);
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("accepts a numeric player id", async () => {
    const order = await createViaApi({ playerId: 123456789, zoneId: 1234 });
    expect(order.playerId).toBe("123456789");
    expect(order.zoneId).toBe("1234");
  });

  it("returns 503 payment_unavailable when KHQR is misconfigured", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setEnv({ PAYMENT_MODE: "bakong", BAKONG_ACCOUNT_ID: "" });
    const res = await createOrderRoute(post("/api/orders", await orderBody()));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "payment_unavailable" });
  });

  it("rate-limits order creation per IP (10/min)", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await createOrderRoute(post("/api/orders", "{}"))).status).toBe(400);
    }
    const limited = await createOrderRoute(post("/api/orders", "{}"));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "rate_limited" });
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    // Another IP is unaffected.
    ip = "198.51.100.77";
    expect((await createOrderRoute(post("/api/orders", "{}"))).status).toBe(400);
  });
});

describe("GET /api/orders/[code]", () => {
  it("returns the public order without caching", async () => {
    const created = await createViaApi();
    const res = await getOrderRoute(get(`/api/orders/${created.code}`), params(created.code.toLowerCase()));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { order } = (await res.json()) as { order: PublicOrder };
    expect(order.code).toBe(created.code);
    expect(order.status).toBe("pending_payment");
  });

  it("expires an order whose window has closed", async () => {
    const created = await createViaApi();
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(orders.code, created.code));
    const res = await getOrderRoute(get(`/api/orders/${created.code}`), params(created.code));
    const { order } = (await res.json()) as { order: PublicOrder };
    expect(order.status).toBe("expired");
    expect(order.khqr).toBeNull();
    expect(order.timeline.map((e) => e.type)).toEqual(["created", "expired"]);
  });

  it("rate-limits polling per order, so customers sharing a carrier IP are not throttled", async () => {
    const a = await createViaApi();
    const b = await createViaApi();
    for (let i = 0; i < 60; i++) {
      expect((await getOrderRoute(get(`/api/orders/${a.code}`), params(a.code))).status).toBe(200);
    }
    const limited = await getOrderRoute(get(`/api/orders/${a.code}`), params(a.code));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    // Another customer's order behind the same (CGNAT) IP still polls fine.
    expect((await getOrderRoute(get(`/api/orders/${b.code}`), params(b.code))).status).toBe(200);
  });

  it("404s unknown and malformed codes", async () => {
    expect((await getOrderRoute(get("/api/orders/SKNOPE2345"), params("SKNOPE2345"))).status).toBe(404);
    const res = await getOrderRoute(get("/api/orders/x"), params("' or 1=1 --"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});

describe("POST /api/orders/[code]/simulate-payment", () => {
  it("marks a pending order paid in mock mode", async () => {
    const created = await createViaApi();
    const res = await simulatePayment(post(`/api/orders/${created.code}/simulate-payment`, ""), params(created.code));
    expect(res.status).toBe(200);
    const { order } = (await res.json()) as { order: PublicOrder };
    expect(order.status).toBe("processing"); // FULFILLMENT_MODE=manual
    expect(order.paidAt).not.toBeNull();
    expect(order.khqr).toBeNull();
    expect(order.timeline.map((e) => e.type)).toEqual(["created", "paid", "processing"]);

    const again = await simulatePayment(post(`/api/orders/${created.code}/simulate-payment`, ""), params(created.code));
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: "not_pending", order: { status: "processing" } });
  });

  it("delivers immediately with mock fulfillment", async () => {
    setEnv({ FULFILLMENT_MODE: "mock" });
    const created = await createViaApi();
    const res = await simulatePayment(post(`/api/orders/${created.code}/simulate-payment`, ""), params(created.code));
    expect(((await res.json()) as { order: PublicOrder }).order.status).toBe("delivered");
  });

  it("does not exist in bakong mode", async () => {
    const created = await createViaApi();
    setEnv({ PAYMENT_MODE: "bakong" });
    const res = await simulatePayment(post(`/api/orders/${created.code}/simulate-payment`, ""), params(created.code));
    expect(res.status).toBe(404);
    const [row] = await db.select().from(orders).where(eq(orders.code, created.code));
    expect(row!.status).toBe("pending_payment");
  });

  it("404s unknown orders and refuses expired ones", async () => {
    expect((await simulatePayment(post("/x", ""), params("SKNOPE2345"))).status).toBe(404);
    const created = await createViaApi();
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(orders.code, created.code));
    const res = await simulatePayment(post("/x", ""), params(created.code));
    expect(res.status).toBe(409);
  });
});

describe("POST /api/orders/[code]/cancel", () => {
  it("cancels pending orders once", async () => {
    const created = await createViaApi();
    const res = await cancelOrderRoute(post(`/api/orders/${created.code}/cancel`, ""), params(created.code));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { order: PublicOrder }).order.status).toBe("cancelled");
    const again = await cancelOrderRoute(post(`/api/orders/${created.code}/cancel`, ""), params(created.code));
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: "not_pending" });
    expect((await cancelOrderRoute(post("/x", ""), params("SKNOPE2345"))).status).toBe(404);
  });
});

describe("POST /api/players/lookup", () => {
  it("returns the nickname or a stable error", async () => {
    const lookup = async (body: unknown) => {
      const res = await lookupPlayerRoute(post("/api/players/lookup", body));
      return { status: res.status, body: await res.json() };
    };
    expect(await lookup({ gameSlug: "mobile-legends", playerId: "123456789", zoneId: "1234" })).toEqual({
      status: 200,
      body: { ok: true, playerName: mockNickname("123456789"), playerId: "123456789", zoneId: "1234" },
    });
    expect((await lookup({ gameSlug: "mobile-legends", playerId: "123456000", zoneId: "1234" })).status).toBe(404);
    expect(await lookup({ gameSlug: "nope", playerId: "123456789" })).toMatchObject({
      status: 404,
      body: { error: "game_not_found" },
    });
    expect(await lookup({ gameSlug: "free-fire", playerId: "abc" })).toMatchObject({
      status: 400,
      body: { ok: false, error: "invalid_id", field: "playerId" },
    });
    expect(await lookup({ gameSlug: "mobile-legends", playerId: "123456789" })).toMatchObject({
      status: 400,
      body: { error: "invalid_zone", field: "zoneId" },
    });
  });

  it("rate-limits lookups (30/min)", async () => {
    const body = { gameSlug: "free-fire", playerId: "1234567" };
    for (let i = 0; i < 30; i++) expect((await lookupPlayerRoute(post("/api/players/lookup", body))).status).toBe(200);
    expect((await lookupPlayerRoute(post("/api/players/lookup", body))).status).toBe(429);
  });
});

describe("POST /api/promo/validate", () => {
  it("previews the discount exactly as createOrder computes it", async () => {
    const body = await orderBody();
    const res = await validatePromoRoute(
      post("/api/promo/validate", { code: " tiktok5 ", gameSlug: body.gameSlug, packageId: body.packageId }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      code: "TIKTOK5",
      description: "5% off for TikTok followers (max $2)",
      discountCents: 7,
      subtotalCents: 145,
      totalCents: 138,
    });
  });

  it("returns PromoError codes", async () => {
    const body = await orderBody();
    const check = async (code: string) => {
      const res = await validatePromoRoute(
        post("/api/promo/validate", { code, gameSlug: body.gameSlug, packageId: body.packageId }),
      );
      return { status: res.status, body: await res.json() };
    };
    expect(await check("FOLLOW10")).toEqual({ status: 400, body: { ok: false, error: "min_order" } });
    expect(await check("NOPE")).toEqual({ status: 400, body: { ok: false, error: "not_found" } });
  });
});

describe("/api/cron/reconcile", () => {
  it("runs without a secret outside production", async () => {
    const created = await createViaApi();
    await db
      .update(orders)
      .set({ paymentExpiresAt: new Date(Date.now() - 5 * 60_000) })
      .where(eq(orders.code, created.code));
    const res = await cronGet(get("/api/cron/reconcile"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ expired: 1, checked: 1, paid: 0 });
  });

  it("requires the bearer secret when CRON_SECRET is set", async () => {
    setEnv({ CRON_SECRET: "s3cret-cron-value" });
    expect((await cronGet(get("/api/cron/reconcile"))).status).toBe(401);
    expect((await cronPost(post("/api/cron/reconcile", "", { authorization: "Bearer wrong" }))).status).toBe(401);
    const ok = await cronPost(post("/api/cron/reconcile", "", { authorization: "Bearer s3cret-cron-value" }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ expired: 0, checked: 0, paid: 0 });
  });

  it("refuses to run unauthenticated in production", async () => {
    setEnv({ NODE_ENV: "production" });
    expect((await cronGet(get("/api/cron/reconcile"))).status).toBe(401);
  });
});
