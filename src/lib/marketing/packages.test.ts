import { describe, expect, it } from "vitest";
import { discountPercent, isOnSale, isPassPackage, minPrice, pickHighlightPackages, pickListPackages } from "./packages";
import { describeOffer, isPromoLive, offerAppliesTo, offerConditions, offerHeadline, toPromoOffer } from "./promo-offer";
import { displayHost, latinText, truncate } from "./og-text";
import type { PromoCode } from "@/db/schema";

const pk = (name: string, priceCents: number, extra: Record<string, unknown> = {}) => ({ name, priceCents, ...extra });

describe("packages", () => {
  it("detects passes and sales", () => {
    expect(isPassPackage({ name: "Weekly Diamond Pass" })).toBe(true);
    expect(isPassPackage({ name: "Monthly Membership" })).toBe(true);
    expect(isPassPackage({ name: "Blessing of the Welkin Moon" })).toBe(true);
    expect(isPassPackage({ name: "86 Diamonds" })).toBe(false);
    expect(isOnSale(pk("a", 150, { compareAtCents: 180 }))).toBe(true);
    expect(isOnSale(pk("a", 150, { compareAtCents: 150 }))).toBe(false);
    expect(discountPercent(pk("a", 150, { compareAtCents: 180 }))).toBe(17);
    expect(discountPercent(pk("a", 150))).toBeNull();
    expect(minPrice([pk("a", 0), pk("b", 99), pk("c", 25)])).toBe(25);
    expect(minPrice([])).toBeNull();
  });

  it("picks badged / on-sale packages first, spreads the rest over the price range, keeps admin order", () => {
    const list = [
      pk("Weekly", 145, { badge: "hot" }),
      pk("11", 25),
      pk("22", 45),
      pk("56", 105),
      pk("86", 150, { badge: "best" }),
      pk("172", 295),
      pk("257", 435),
      pk("706", 1160),
      pk("Free gift", 0),
    ];
    const picked = pickHighlightPackages(list, 4).map((p) => p.name);
    expect(picked).toHaveLength(4);
    expect(picked).toContain("86");
    expect(picked).toContain("Weekly");
    expect(picked).not.toContain("Free gift");
    // Original order is preserved.
    expect(picked).toEqual([...picked].sort((a, b) => list.findIndex((p) => p.name === a) - list.findIndex((p) => p.name === b)));
    // Spread includes the cheapest and the biggest remaining packs.
    expect(picked).toEqual(["Weekly", "11", "86", "706"]);
    expect(pickHighlightPackages(list, 0)).toEqual([]);
    expect(pickHighlightPackages([pk("a", 10)], 3).map((p) => p.name)).toEqual(["a"]);
  });

  it("lists everything when it fits", () => {
    expect(pickListPackages([pk("a", 10), pk("b", 0), pk("c", 30)], 5).map((p) => p.name)).toEqual(["a", "c"]);
    expect(pickListPackages(Array.from({ length: 12 }, (_, i) => pk(`p${i}`, 100 + i)), 5)).toHaveLength(5);
  });
});

const promo = (over: Partial<PromoCode> = {}): PromoCode => ({
  id: 1,
  code: "FOLLOW10",
  description: null,
  type: "percent",
  value: 10,
  maxDiscountCents: 200,
  minOrderCents: 500,
  maxUses: null,
  usedCount: 0,
  gameId: null,
  channel: "facebook",
  startsAt: null,
  endsAt: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe("promo offers", () => {
  const now = new Date("2026-10-13T00:00:00Z");

  it("describes offers in English and Khmer", () => {
    const offer = toPromoOffer(promo());
    expect(describeOffer(offer, "en")).toBe("10% off (up to $2.00) on orders from $5.00");
    expect(describeOffer(offer, "km")).toBe("បញ្ចុះ 10% (រហូតដល់ $2.00) សម្រាប់ការកុម្ម៉ង់ចាប់ពី $5.00");
    expect(offerHeadline(offer)).toBe("10% OFF");
    expect(offerConditions(offer)).toBe("Max $2.00 · orders from $5.00");
    const fixed = toPromoOffer(promo({ type: "fixed", value: 100, maxDiscountCents: null, minOrderCents: 0 }));
    expect(describeOffer(fixed, "en")).toBe("$1.00 off");
    expect(offerHeadline(fixed)).toBe("$1.00 OFF");
    expect(offerConditions(fixed)).toBe("");
  });

  it("only advertises codes that are live right now", () => {
    expect(isPromoLive(promo(), now)).toBe(true);
    expect(isPromoLive(promo({ active: false }), now)).toBe(false);
    expect(isPromoLive(promo({ endsAt: new Date("2026-10-01") }), now)).toBe(false);
    expect(isPromoLive(promo({ startsAt: new Date("2026-11-01") }), now)).toBe(false);
    expect(isPromoLive(promo({ maxUses: 5, usedCount: 5 }), now)).toBe(false);
    // Game-restricted and minimum-order codes are still live; wording handles them.
    expect(isPromoLive(promo({ gameId: 3, minOrderCents: 10_000 }), now)).toBe(true);
    expect(isPromoLive(null, now)).toBe(false);
  });

  it("checks the game a code applies to", () => {
    expect(offerAppliesTo({ gameId: null }, 4)).toBe(true);
    expect(offerAppliesTo({ gameId: 4 }, 4)).toBe(true);
    expect(offerAppliesTo({ gameId: 4 }, 5)).toBe(false);
    expect(offerAppliesTo({ gameId: 4 }, null)).toBe(false);
  });
});

describe("image text", () => {
  it("keeps only characters the bundled Latin font can draw", () => {
    expect(latinText("🔥 86 Diamonds — Best!")).toBe("86 Diamonds — Best!");
    expect(latinText("ពេជ្រ 257")).toBe("257");
    expect(latinText("ហ្គេម", "Game")).toBe("Game");
    expect(latinText("  Café   Crème ")).toBe("Café Crème");
  });

  it("truncates and formats hosts", () => {
    expect(truncate("Mobile Legends: Bang Bang", 10)).toBe("Mobile Le…");
    expect(truncate("short", 10)).toBe("short");
    expect(displayHost("https://www.sakaistore.com/")).toBe("sakaistore.com");
    expect(displayHost("http://localhost:3000")).toBe("localhost:3000");
  });
});
