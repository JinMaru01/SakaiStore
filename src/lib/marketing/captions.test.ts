import { describe, expect, it } from "vitest";
import { classifyChannel } from "@/lib/attribution";
import {
  buildUtmLink,
  CAPTION_TEMPLATES,
  defaultGiveawayEnd,
  generateCaptions,
  isCaptionTemplate,
  kmNumber,
  mergeHashtags,
  TIKTOK_CAPTION_LIMIT,
  type CaptionInput,
  type CaptionTemplate,
} from "./captions";
import type { PromoOffer } from "./promo-offer";

const pk = (name: string, usd: number, extra: Record<string, unknown> = {}) => ({
  name,
  priceCents: Math.round(usd * 100),
  ...extra,
});

const MLBB = {
  id: 1,
  slug: "mobile-legends",
  name: "Mobile Legends: Bang Bang",
  currencyName: "Diamonds",
  idLabel: "User ID",
  requiresZone: true,
  zoneLabel: "Zone ID",
  hashtags: "#MLBB #MobileLegends #MLBBCambodia",
};

const PACKAGES = [
  pk("Weekly Diamond Pass", 1.45, { badge: "hot" }),
  pk("11 Diamonds", 0.25),
  pk("56 Diamonds", 1.05),
  pk("86 Diamonds", 1.5, { badge: "best", compareAtCents: 180 }),
  pk("172 Diamonds", 2.95),
  pk("Twilight Pass", 8.5),
];

const OFFERS: Record<string, PromoOffer> = {
  FOLLOW10: { code: "FOLLOW10", type: "percent", value: 10, maxDiscountCents: 200, minOrderCents: 500, gameId: null, channel: "facebook" },
  TIKTOK5: { code: "TIKTOK5", type: "percent", value: 5, maxDiscountCents: 200, minOrderCents: 0, gameId: null, channel: "tiktok" },
  FFONLY: { code: "FFONLY", type: "fixed", value: 50, maxDiscountCents: null, minOrderCents: 0, gameId: 2, channel: null },
};

const NOW = new Date("2026-10-13T03:00:00Z"); // Tuesday 10:00 in Phnom Penh

function input(over: Partial<CaptionInput> = {}): CaptionInput {
  return {
    template: "price_list",
    game: MLBB,
    packages: PACKAGES,
    catalog: [
      { slug: "mobile-legends", name: "Mobile Legends: Bang Bang", currencyName: "Diamonds", minPriceCents: 25 },
      { slug: "free-fire", name: "Free Fire", currencyName: "Diamonds", minPriceCents: 30 },
      { slug: "pubg-mobile", name: "PUBG Mobile", currencyName: "UC", minPriceCents: 99 },
    ],
    storeName: "Sakai Store",
    siteUrl: "https://sakaistore.com/",
    hashtags: "#SakaiStore #GameTopUp #Cambodia",
    platformPromoCodes: { facebook: "FOLLOW10", tiktok: "TIKTOK5" },
    promoOffers: OFFERS,
    tiktokHandle: "sakaistore",
    now: NOW,
    ...over,
  };
}

const KHMER = /[ក-៿]/;
const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe("buildUtmLink", () => {
  it("adds normalized utm params and keeps other query params", () => {
    const url = buildUtmLink("https://sakaistore.com/games/free-fire?promo=FB5", {
      source: "Facebook",
      medium: "Social",
      campaign: "Free Fire Sale!",
      content: "page post",
    });
    expect(params(url)).toEqual({
      promo: "FB5",
      utm_source: "facebook",
      utm_medium: "social",
      utm_campaign: "free_fire_sale",
      utm_content: "page_post",
    });
  });

  it("replaces existing UTMs and strips click ids", () => {
    const url = buildUtmLink("https://x.com/?utm_source=old&fbclid=abc&ttclid=t&utm_content=old", {
      source: "tiktok",
      medium: "social",
      campaign: "bio",
    });
    expect(params(url)).toEqual({ utm_source: "tiktok", utm_medium: "social", utm_campaign: "bio" });
  });

  it("returns invalid urls unchanged", () => {
    expect(buildUtmLink("not a url", { source: "a", medium: "b", campaign: "c" })).toBe("not a url");
  });
});

describe("mergeHashtags", () => {
  it("normalizes, de-duplicates case-insensitively and keeps order", () => {
    expect(mergeHashtags("#MLBB mlbb, #Top-Up", null, "##Cambodia #mlbb ខ្មែរ")).toEqual(["#MLBB", "#TopUp", "#Cambodia", "#ខ្មែរ"]);
  });
});

describe("generateCaptions", () => {
  it.each(CAPTION_TEMPLATES.map((t) => t.id))("%s: every output exists in English and natural Khmer", (template) => {
    const r = generateCaptions(input({ template }));
    for (const out of [r.facebook, r.tiktok, r.videoScript]) {
      expect(out.en.length).toBeGreaterThan(40);
      expect(out.km.length).toBeGreaterThan(40);
      expect(KHMER.test(out.en)).toBe(false);
      expect(KHMER.test(out.km)).toBe(true);
    }
    expect([...r.tiktok.en].length).toBeLessThanOrEqual(TIKTOK_CAPTION_LIMIT);
    expect([...r.tiktok.km].length).toBeLessThanOrEqual(TIKTOK_CAPTION_LIMIT);
  });

  it.each(CAPTION_TEMPLATES.map((t) => t.id))("%s: links carry facebook/tiktok social UTMs that attribute correctly", (template) => {
    const r = generateCaptions(input({ template }));
    const fb = params(r.links.facebook);
    const tt = params(r.links.tiktok);
    expect(fb).toMatchObject({ utm_source: "facebook", utm_medium: "social", utm_campaign: "mobile-legends", utm_content: template });
    expect(tt).toMatchObject({ utm_source: "tiktok", utm_medium: "social", utm_campaign: "mobile-legends", utm_content: template });
    expect(classifyChannel({ utmSource: fb.utm_source })).toBe("facebook");
    expect(classifyChannel({ utmSource: tt.utm_source })).toBe("tiktok");
    expect(new URL(r.links.facebook).pathname).toBe("/games/mobile-legends");
    // The links appear in the copy itself.
    expect(r.facebook.en).toContain(r.links.facebook);
    expect(r.facebook.km).toContain(r.links.facebook);
    expect(r.tiktok.en).toContain(r.links.tiktok);
    expect(r.videoScript.km).toContain(r.links.tiktok);
  });

  it("uses each platform's promo code, pre-fills it in the link and describes the offer", () => {
    const r = generateCaptions(input());
    expect(params(r.links.facebook).promo).toBe("FOLLOW10");
    expect(params(r.links.tiktok).promo).toBe("TIKTOK5");
    expect(r.facebook.en).toContain("FOLLOW10 — 10% off (up to $2.00) on orders from $5.00");
    expect(r.facebook.km).toContain("បញ្ចុះ 10%");
    expect(r.tiktok.en).toContain("TIKTOK5");
    expect(r.tiktok.en).not.toContain("FOLLOW10");
  });

  it("falls back to the shared promo code and drops codes for another game", () => {
    const shared = generateCaptions(input({ platformPromoCodes: undefined, promoCode: "follow10" }));
    expect(shared.facebook.en).toContain("FOLLOW10");
    expect(shared.tiktok.en).toContain("FOLLOW10");

    const wrongGame = generateCaptions(input({ platformPromoCodes: { facebook: "FFONLY", tiktok: null } }));
    expect(wrongGame.facebook.en).not.toContain("FFONLY");
    expect(wrongGame.links.facebook).not.toContain("promo=");
    expect(wrongGame.warnings.join(" ")).toContain("FFONLY");
  });

  it("price list lists prices with honest compare-at prices and hashtags", () => {
    const r = generateCaptions(input());
    expect(r.facebook.en).toContain("• 86 Diamonds — $1.50 (was $1.80) ⭐");
    expect(r.facebook.km).toContain("• 86 Diamonds — $1.50 (ធម្មតា $1.80) ⭐");
    expect(r.facebook.en).toContain("#MLBB #MobileLegends #MLBBCambodia #PriceList #SakaiStore");
    // TikTok: hook first, short name.
    expect(r.tiktok.en.split("\n")[0]).toBe("Mobile Legends Diamonds from $0.25 💎 Pay with KHQR, delivered in minutes ⚡");
    expect(r.tiktok.km).toContain("ពេជ្រ Mobile Legends ចាប់ពី $0.25");
  });

  it("video scripts have a 0–3 s hook, scenes, a CTA and on-screen text", () => {
    const r = generateCaptions(input());
    expect(r.videoScript.en).toMatch(/HOOK \(0–3s\)/);
    expect(r.videoScript.en).toMatch(/SCENE 1 \(/);
    expect(r.videoScript.en).toMatch(/CTA \(/);
    expect(r.videoScript.en).toContain("On-screen text:");
    expect(r.videoScript.km).toContain("HOOK (០–៣ វិនាទី)");
    expect(r.videoScript.km).toContain("ឈុតទី១");
    expect(r.videoScript.km).toContain("អក្សរលើអេក្រង់៖");
    expect(r.videoScript.en).toContain("Commercial Music Library");
  });

  it("flash sale shows savings, the end time, and warns when nothing is discounted", () => {
    const r = generateCaptions(input({ template: "flash_sale", ends: "Sunday 9 PM" }));
    expect(r.facebook.en).toContain("⏰ Ends Sunday 9 PM");
    expect(r.facebook.en).toContain("86 Diamonds — $1.50 (was $1.80 · save 17%)");
    expect(r.facebook.km).toContain("សន្សំ 17%");
    expect(r.warnings).toEqual([]);

    const fake = generateCaptions(
      input({ template: "flash_sale", packages: [pk("11 Diamonds", 0.25)], platformPromoCodes: { facebook: null, tiktok: null } }),
    );
    expect(fake.warnings.join(" ")).toMatch(/Nothing is actually discounted/);
    expect(fake.facebook.en).toContain("⏰ Limited time only");
  });

  it("new pass lists pass packages, or warns and lists small packs", () => {
    const r = generateCaptions(input({ template: "new_pass" }));
    expect(r.facebook.en).toContain("• Weekly Diamond Pass — $1.45");
    expect(r.facebook.en).toContain("• Twilight Pass — $8.50");
    expect(r.facebook.en).not.toContain("172 Diamonds");

    const none = generateCaptions(input({ template: "new_pass", packages: [pk("60 UC", 0.99), pk("325 UC", 4.8)] }));
    expect(none.warnings.join(" ")).toMatch(/no pass or membership/);
    expect(none.facebook.en).toContain("60 UC");
  });

  it("how-to lists the steps with the game's id + zone labels and a password warning", () => {
    const r = generateCaptions(input({ template: "how_to_topup" }));
    expect(r.facebook.en).toContain("2️⃣ Enter your User ID and Zone ID");
    expect(r.facebook.en).toContain("We never ask for your password");
    expect(r.facebook.km).toContain("២. បញ្ចូល User ID និង Zone ID");
    expect(r.facebook.km).toContain("«បង់ប្រាក់ដោយ KHQR»");
  });

  it("giveaway includes platform-compliant rules on each platform", () => {
    const r = generateCaptions(input({ template: "giveaway" }));
    for (const text of [r.facebook.en]) {
      expect(text).toContain("no purchase necessary");
      expect(text).toContain("in no way sponsored, endorsed or administered by, or associated with, Facebook");
      expect(text).toContain("release Facebook");
      expect(text).toContain("NEVER ask for your password");
      expect(text).toContain("independent reseller");
      // Meta forbids tag-a-friend / share-to-enter mechanics.
      expect(text).not.toMatch(/tag (a|your) friends?|share (this|on your)/i);
    }
    expect(r.tiktok.en).toContain("associated with, TikTok");
    expect(r.tiktok.en).not.toContain("Facebook");
    expect(r.tiktok.km).toContain("TikTok");
    expect(r.facebook.km).toContain("មិនមែនជាការឧបត្ថម្ភ");
    // Default prize: the best-value package; default winners 3; default end: next Sunday 8 PM.
    expect(r.facebook.en).toContain("win 86 Diamonds (Mobile Legends)! (3 winners)");
    expect(r.facebook.en).toContain("Ends Sunday 18 Oct, 8 PM");
    expect(r.facebook.km).toContain("ថ្ងៃអាទិត្យ ទី១៨ ខែតុលា");
    expect(r.tiktok.en).toContain("@sakaistore");

    const custom = generateCaptions(input({ template: "giveaway", giveaway: { prize: "Weekly Pass", winners: 1 }, ends: "Friday" }));
    expect(custom.facebook.en).toContain("win Weekly Pass! (1 winner)");
    expect(custom.facebook.en).toContain("Ends Friday");
  });

  it.each(CAPTION_TEMPLATES.map((t) => t.id))("%s: all-games version links to the home page with campaign = template", (template) => {
    const r = generateCaptions(input({ template: template as CaptionTemplate, game: null, packages: [] }));
    const fb = new URL(r.links.facebook);
    expect(fb.pathname).toBe("/");
    expect(Object.fromEntries(fb.searchParams)).toEqual({
      utm_source: "facebook",
      utm_medium: "social",
      utm_campaign: template,
      utm_content: "all-games",
    });
    expect(r.facebook.en).not.toContain("undefined");
    expect(r.facebook.km).not.toContain("undefined");
    expect(r.videoScript.en).not.toContain("undefined");
  });

  it("all-games price list shows every game's from price", () => {
    const r = generateCaptions(input({ game: null, packages: [] }));
    expect(r.facebook.en).toContain("• Free Fire — from $0.30");
    expect(r.facebook.km).toContain("• PUBG Mobile — ចាប់ពី $0.99");
    expect(r.tiktok.en).toContain("from $0.25");
  });

  it("keeps TikTok captions within 2,200 characters by dropping hashtags first", () => {
    const many = Array.from({ length: 40 }, (_, i) => pk(`Package ${"x".repeat(60)} ${i}`, 1 + i));
    const r = generateCaptions(input({ template: "giveaway", giveaway: { prize: "p".repeat(200) }, packages: many }));
    expect([...r.tiktok.en].length).toBeLessThanOrEqual(TIKTOK_CAPTION_LIMIT);
  });

  it("is deterministic for the same input", () => {
    expect(generateCaptions(input({ template: "giveaway" }))).toEqual(generateCaptions(input({ template: "giveaway" })));
  });
});

describe("helpers", () => {
  it("knows its templates", () => {
    expect(isCaptionTemplate("flash_sale")).toBe(true);
    expect(isCaptionTemplate("spam")).toBe(false);
  });

  it("writes Khmer digits", () => {
    expect(kmNumber(2026)).toBe("២០២៦");
  });

  it("defaults giveaways to a Sunday 8 PM at least 3 days away", () => {
    expect(defaultGiveawayEnd(new Date("2026-10-13T03:00:00Z")).en).toBe("Sunday 18 Oct, 8 PM");
    // Friday evening in Phnom Penh → the Sunday after next.
    expect(defaultGiveawayEnd(new Date("2026-10-16T12:00:00Z")).en).toBe("Sunday 25 Oct, 8 PM");
  });
});
