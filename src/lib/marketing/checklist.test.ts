import { describe, expect, it } from "vitest";
import type { PromoCode } from "@/db/schema";
import { buildSetupChecklist, type ChecklistInput } from "./checklist";

const NOW = new Date("2026-10-13T03:00:00Z");

const promo = (over: Partial<PromoCode>): PromoCode => ({
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
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

const READY: ChecklistInput = {
  social: {
    facebookUrl: "https://www.facebook.com/sakaistore",
    tiktokUrl: "https://www.tiktok.com/@sakaistore",
    messengerUrl: "https://m.me/sakaistore",
  },
  marketing: { followPromoCode: "follow10" },
  pixels: { meta: "123456789012345", tiktok: "C4ABCDEFGH1234567890" },
  followPromo: promo({}),
  channelPromos: [promo({ id: 2, code: "FB5", value: 5 }), promo({ id: 3, code: "TIKTOK5", value: 5, channel: "tiktok" })],
  now: NOW,
};

const byId = (input: ChecklistInput) => Object.fromEntries(buildSetupChecklist(input).map((i) => [i.id, i]));

describe("buildSetupChecklist", () => {
  it("is all green when everything is configured", () => {
    const items = buildSetupChecklist(READY);
    expect(items.map((i) => i.id)).toEqual([
      "facebook_url",
      "messenger_url",
      "tiktok_url",
      "meta_pixel",
      "tiktok_pixel",
      "follow_code",
      "channel_codes",
    ]);
    expect(items.every((i) => i.done)).toBe(true);
    const ids = byId(READY);
    expect(ids.follow_code!.detail).toBe("FOLLOW10: 10% off (up to $2.00) on orders from $5.00.");
    expect(ids.channel_codes!.detail).toBe("Facebook: FB5 · TikTok: TIKTOK5");
    expect(ids.meta_pixel!.playbook).toBe("4-meta-pixel-and-domain-verification");
  });

  it("flags missing or wrong social links", () => {
    const ids = byId({
      ...READY,
      social: { facebookUrl: "https://evil.example/sakai", tiktokUrl: "https://www.tiktok.com/", messengerUrl: "" },
    });
    expect(ids.facebook_url!.done).toBe(false);
    expect(ids.facebook_url!.detail).toMatch(/does not point to facebook.com/);
    expect(ids.tiktok_url!.done).toBe(false);
    expect(ids.messenger_url!.done).toBe(false);
    expect(ids.facebook_url!.action?.href).toBe("/admin/settings");
  });

  it("explains invalid pixel ids instead of loading them", () => {
    const ids = byId({ ...READY, pixels: { meta: "abc<script>", tiktok: "" } });
    expect(ids.meta_pixel!.done).toBe(false);
    expect(ids.meta_pixel!.detail).toMatch(/not a valid Pixel ID/);
    expect(ids.tiktok_pixel!.detail).toMatch(/Set NEXT_PUBLIC_TIKTOK_PIXEL_ID/);
  });

  it("checks that the follower code exists and is live", () => {
    expect(byId({ ...READY, marketing: { followPromoCode: "" } }).follow_code!.detail).toMatch(/Pick a follower code/);
    expect(byId({ ...READY, followPromo: null }).follow_code!.detail).toMatch(/does not exist/);
    const expired = byId({ ...READY, followPromo: promo({ endsAt: new Date("2026-10-01") }) });
    expect(expired.follow_code!.done).toBe(false);
    expect(expired.follow_code!.action?.href).toBe("/admin/promos");
  });

  it("requires a live channel code for both Facebook and TikTok", () => {
    const ids = byId({ ...READY, channelPromos: [promo({ code: "FB5" }), promo({ code: "TIKTOK5", channel: "tiktok", active: false })] });
    expect(ids.channel_codes!.done).toBe(false);
    expect(ids.channel_codes!.detail).toMatch(/channel TikTok/);
  });
});
