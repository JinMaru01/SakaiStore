import { describe, expect, it } from "vitest";
import type { PromoCode } from "@/db/schema";
import { clampDiscount, computeDiscount, evaluatePromo, normalizePromoCode } from "./pricing";

const NOW = new Date("2026-10-13T12:00:00Z");

function promo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: 1,
    code: "TEST",
    description: null,
    type: "percent",
    value: 10,
    maxDiscountCents: null,
    minOrderCents: 0,
    maxUses: null,
    usedCount: 0,
    gameId: null,
    channel: null,
    startsAt: null,
    endsAt: null,
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const ctx = { subtotalCents: 1000, gameId: 1, now: NOW };

describe("normalizePromoCode", () => {
  it("is case-insensitive and ignores spaces", () => {
    expect(normalizePromoCode(" tiktok5 ")).toBe("TIKTOK5");
    expect(normalizePromoCode("fb 5")).toBe("FB5");
    expect(normalizePromoCode(undefined)).toBe("");
    expect(normalizePromoCode(null)).toBe("");
  });
});

describe("evaluatePromo", () => {
  it("computes percent discounts, rounding down", () => {
    expect(evaluatePromo(promo({ value: 5 }), { ...ctx, subtotalCents: 145 })).toEqual({ ok: true, discountCents: 7 });
    expect(evaluatePromo(promo({ value: 10 }), ctx)).toEqual({ ok: true, discountCents: 100 });
  });

  it("caps percent discounts with maxDiscountCents", () => {
    expect(evaluatePromo(promo({ value: 50, maxDiscountCents: 200 }), ctx)).toEqual({ ok: true, discountCents: 200 });
  });

  it("applies fixed discounts in cents", () => {
    expect(evaluatePromo(promo({ type: "fixed", value: 150 }), ctx)).toEqual({ ok: true, discountCents: 150 });
  });

  it("never lets the total drop below 1 cent", () => {
    expect(evaluatePromo(promo({ type: "fixed", value: 5000 }), ctx)).toEqual({ ok: true, discountCents: 999 });
    expect(evaluatePromo(promo({ value: 100 }), ctx)).toEqual({ ok: true, discountCents: 999 });
    expect(evaluatePromo(promo({ value: 250 }), ctx)).toEqual({ ok: true, discountCents: 999 });
    expect(evaluatePromo(promo({ type: "fixed", value: 5 }), { ...ctx, subtotalCents: 1 })).toEqual({
      ok: true,
      discountCents: 0,
    });
  });

  it("rejects unknown and inactive codes", () => {
    expect(evaluatePromo(null, ctx)).toEqual({ ok: false, error: "not_found" });
    expect(evaluatePromo(promo({ active: false }), ctx)).toEqual({ ok: false, error: "inactive" });
  });

  it("respects the validity window", () => {
    expect(evaluatePromo(promo({ startsAt: new Date(NOW.getTime() + 1000) }), ctx)).toEqual({
      ok: false,
      error: "not_started",
    });
    expect(evaluatePromo(promo({ endsAt: NOW }), ctx)).toEqual({ ok: false, error: "expired" });
    expect(
      evaluatePromo(
        promo({ startsAt: new Date(NOW.getTime() - 1000), endsAt: new Date(NOW.getTime() + 1000) }),
        ctx,
      ).ok,
    ).toBe(true);
  });

  it("enforces maxUses", () => {
    expect(evaluatePromo(promo({ maxUses: 3, usedCount: 3 }), ctx)).toEqual({ ok: false, error: "used_up" });
    expect(evaluatePromo(promo({ maxUses: 3, usedCount: 2 }), ctx).ok).toBe(true);
  });

  it("enforces the game restriction and minimum order", () => {
    expect(evaluatePromo(promo({ gameId: 2 }), ctx)).toEqual({ ok: false, error: "not_applicable" });
    expect(evaluatePromo(promo({ gameId: 1 }), ctx).ok).toBe(true);
    expect(evaluatePromo(promo({ minOrderCents: 1001 }), ctx)).toEqual({ ok: false, error: "min_order" });
    expect(evaluatePromo(promo({ minOrderCents: 1000 }), ctx).ok).toBe(true);
  });
});

describe("helpers", () => {
  it("clampDiscount handles garbage", () => {
    expect(clampDiscount(Number.NaN, 100)).toBe(0);
    expect(clampDiscount(-5, 100)).toBe(0);
    expect(clampDiscount(12.9, 100)).toBe(12);
  });
  it("computeDiscount ignores a negative cap", () => {
    expect(computeDiscount({ type: "percent", value: 10, maxDiscountCents: -1 }, 1000)).toBe(100);
  });
});
