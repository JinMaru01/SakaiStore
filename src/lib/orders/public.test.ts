import { afterEach, describe, expect, it, vi } from "vitest";
import type { Order, OrderEvent } from "@/db/schema";
import { resetEnvCache } from "@/lib/env";
import { toPublicOrder } from "./public";

const t0 = new Date("2026-10-13T10:00:00Z");
const at = (s: number) => new Date(t0.getTime() + s * 1000);

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "6f1c2a52-8a0e-4a39-9a0c-3b2d8c1f0e11",
    code: "SK7F3K9Q2M",
    status: "pending_payment",
    gameId: 1,
    packageId: 1,
    gameSlug: "mobile-legends",
    gameName: "Mobile Legends: Bang Bang",
    packageName: "86 Diamonds",
    playerId: "123456789",
    zoneId: "1234",
    playerName: "ShadowFox_42",
    unitPriceCents: 150,
    discountCents: 7,
    totalCents: 143,
    currency: "USD",
    promoCodeId: 3,
    promoCode: "TIKTOK5",
    paymentMethod: "khqr",
    khqr: "000201010212...",
    khqrMd5: "0123456789abcdef0123456789abcdef",
    paymentExpiresAt: at(900),
    paymentRef: null,
    paymentPayload: { secret: "raw bakong payload" },
    lastPaymentCheckAt: null,
    paymentFinalCheckedAt: null,
    paidAt: null,
    deliveredAt: null,
    contactPhone: "012345678",
    contactTelegram: "someone",
    customerTelegramChatId: null,
    customerNote: null,
    adminNote: "VIP customer",
    locale: "en",
    channel: "tiktok",
    utmSource: "tiktok",
    utmMedium: "social",
    utmCampaign: "launch",
    utmContent: null,
    utmTerm: null,
    clickId: "E.C.P.abc",
    referrer: "https://www.tiktok.com/",
    landingPath: "/?utm_source=tiktok",
    ipHash: "abcdef",
    userAgent: "Mozilla/5.0 TikTok",
    createdAt: t0,
    updatedAt: t0,
    ...overrides,
  };
}

function event(id: number, type: string, seconds: number, message: string | null = null): OrderEvent {
  return {
    id,
    orderId: "6f1c2a52-8a0e-4a39-9a0c-3b2d8c1f0e11",
    type,
    message,
    actor: "system",
    data: null,
    createdAt: at(seconds),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
});

describe("toPublicOrder", () => {
  it("exposes the KHQR only while pending", () => {
    expect(toPublicOrder(order()).khqr).toBe("000201010212...");
    expect(toPublicOrder(order({ status: "paid", paidAt: at(60) })).khqr).toBeNull();
    expect(toPublicOrder(order({ status: "expired" })).khqr).toBeNull();
  });

  it("never leaks admin, contact, attribution or payment internals", () => {
    const pub = toPublicOrder(order()) as Record<string, unknown>;
    for (const key of [
      "id",
      "adminNote",
      "ipHash",
      "userAgent",
      "paymentPayload",
      "khqrMd5",
      "contactPhone",
      "contactTelegram",
      "customerTelegramChatId",
      "channel",
      "utmSource",
      "clickId",
      "referrer",
      "landingPath",
    ]) {
      expect(pub).not.toHaveProperty(key);
    }
    expect(JSON.stringify(pub)).not.toContain("VIP customer");
    expect(pub).toMatchObject({
      code: "SK7F3K9Q2M",
      currency: "USD",
      totalCents: 143,
      paymentMode: "mock",
      paymentExpiresAt: at(900).toISOString(),
      createdAt: t0.toISOString(),
      telegramLinked: false,
    });
  });

  it("builds a customer-safe timeline", () => {
    const events = [
      event(4, "note", 70, "admin only"),
      event(1, "created", 0),
      event(3, "processing", 61, "Waiting for admin to deliver"),
      event(2, "paid", 60),
      event(5, "notify", 80),
    ];
    expect(toPublicOrder(order({ status: "processing" }), events).timeline).toEqual([
      { type: "created", at: at(0).toISOString() },
      { type: "paid", at: at(60).toISOString() },
      { type: "processing", at: at(61).toISOString() },
    ]);
    // Without events, falls back to the order's own timestamps.
    expect(toPublicOrder(order({ status: "delivered", paidAt: at(60), deliveredAt: at(120) })).timeline).toEqual([
      { type: "created", at: at(0).toISOString() },
      { type: "paid", at: at(60).toISOString() },
      { type: "delivered", at: at(120).toISOString() },
    ]);
  });

  it("links the Telegram bot when configured", () => {
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "@SakaiStoreBot");
    resetEnvCache();
    const pub = toPublicOrder(order({ customerTelegramChatId: "12345" }));
    expect(pub.telegramLink).toBe("https://t.me/SakaiStoreBot?start=ord_SK7F3K9Q2M");
    expect(pub.telegramLinked).toBe(true);

    vi.stubEnv("TELEGRAM_BOT_USERNAME", "");
    resetEnvCache();
    expect(toPublicOrder(order()).telegramLink).toBeNull();
  });
});
