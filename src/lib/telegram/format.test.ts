import { describe, expect, it } from "vitest";
import type { Order } from "@/db/schema";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import {
  adminActionFooter,
  adminOrderKeyboard,
  alreadyText,
  buildAdminOrderCard,
  buildAdminQueue,
  buildAdminStats,
  buildCustomerLinked,
  buildCustomerStatus,
  buildCustomerUpdate,
  buildRecentOrders,
  buildWelcome,
  channelLabel,
  escapeHtml,
  isPublicHttpUrl,
  localeFromTelegram,
  startUtm,
  type BotMessage,
  type CustomerUpdateKind,
} from "./format";
import { checkTelegramHtml } from "./telegram-html";

const SITE = "https://sakai.example";

function order(over: Partial<Order> = {}): Order {
  return {
    id: "8c7d2c1e-0f0a-4b8e-9a64-1c2d3e4f5a6b",
    code: "SK7F3K9Q2M",
    status: "processing",
    gameId: 1,
    packageId: 1,
    gameSlug: "mobile-legends",
    gameName: "Mobile Legends: Bang Bang",
    packageName: "Weekly Diamond Pass",
    playerId: "123456789",
    zoneId: "1234",
    playerName: "Dara",
    unitPriceCents: 145,
    discountCents: 0,
    totalCents: 145,
    currency: "USD",
    promoCodeId: null,
    promoCode: null,
    paymentMethod: "khqr",
    khqr: null,
    khqrMd5: null,
    paymentExpiresAt: new Date("2026-10-13T07:15:00Z"),
    paymentRef: null,
    paymentPayload: null,
    lastPaymentCheckAt: null,
    paidAt: new Date("2026-10-13T07:05:00Z"), // 14:05 in Phnom Penh
    deliveredAt: null,
    contactPhone: null,
    contactTelegram: null,
    customerTelegramChatId: null,
    customerNote: null,
    adminNote: null,
    locale: "en",
    channel: "direct",
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    clickId: null,
    referrer: null,
    landingPath: null,
    ipHash: null,
    userAgent: null,
    createdAt: new Date("2026-10-13T07:00:00Z"),
    updatedAt: new Date("2026-10-13T07:05:00Z"),
    ...over,
  };
}

function settings(over: { social?: Partial<Settings["social"]>; store?: Partial<Settings["store"]>; promo?: string } = {}) {
  return {
    store: { ...DEFAULT_SETTINGS.store, ...over.store },
    social: { ...DEFAULT_SETTINGS.social, ...over.social },
    marketing: { ...DEFAULT_SETTINGS.marketing, followPromoCode: over.promo ?? "" },
  };
}

const urls = (m: BotMessage) => (m.replyMarkup?.inline_keyboard ?? []).flat().flatMap((b) => ("url" in b ? [b.url] : []));
const callbacks = (m: BotMessage) =>
  (m.replyMarkup?.inline_keyboard ?? []).flat().flatMap((b) => ("callback_data" in b ? [b.callback_data] : []));

describe("escapeHtml", () => {
  it("escapes the characters Telegram HTML cares about", () => {
    expect(escapeHtml(`<b>"Tom" & Jerry</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; Jerry&lt;/b&gt;");
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("isPublicHttpUrl", () => {
  it("accepts public http(s) URLs only", () => {
    expect(isPublicHttpUrl("https://sakai.example/orders/SK7F3K9Q2M")).toBe(true);
    expect(isPublicHttpUrl("http://8.8.8.8/x")).toBe(true);
    for (const bad of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.1.5",
      "https://10.0.0.2",
      "https://172.20.1.1",
      "https://shop.local",
      "javascript:alert(1)",
      "ftp://sakai.example",
      "not a url",
      "",
      null,
    ]) {
      expect(isPublicHttpUrl(bad), String(bad)).toBe(false);
    }
  });
});

describe("admin order alert", () => {
  const paid = order({
    discountCents: 7,
    totalCents: 138,
    promoCode: "TIKTOK5",
    channel: "tiktok",
    utmCampaign: "oct_ml",
    contactPhone: "012 345 678",
    contactTelegram: "@khmer_gamer",
    customerTelegramChatId: "555",
  });

  it("has everything needed to top up, with tap-to-copy ids", () => {
    const { text } = buildAdminOrderCard(paid, { kind: "paid", siteUrl: SITE, actions: true });
    expect(text.split("\n")[0]).toBe("💰 <b>New paid order</b>");
    expect(text).toContain("Order <code>SK7F3K9Q2M</code>");
    expect(text).toContain("🎮 Mobile Legends: Bang Bang");
    expect(text).toContain("📦 <b>Weekly Diamond Pass</b>");
    expect(text).toContain("Player ID: <code>123456789</code>");
    expect(text).toContain("Zone: <code>1234</code>");
    expect(text).toContain("Nickname: Dara");
    expect(text).toContain("Total: <b>$1.38</b> ($1.45 − $0.07 promo <code>TIKTOK5</code>)");
    expect(text).toContain("📣 Channel: 🎵 TikTok · oct_ml");
    expect(text).toContain("🕒 Paid 13 Oct 2026, 14:05");
    expect(text).toContain('012 345 678 · Telegram <a href="https://t.me/khmer_gamer">@khmer_gamer</a>');
    expect(text).toContain("Customer gets Telegram updates");
    expect(text).not.toContain("Paid after the QR expired");
    expect(checkTelegramHtml(text)).toBeNull();
  });

  it("flags simulated (mock-mode) payments so nobody tops up for free", () => {
    const real = buildAdminOrderCard(order({ paymentRef: "abc123hash" }), { kind: "paid", siteUrl: SITE, actions: true });
    expect(real.text).not.toContain("TEST payment");
    const mock = buildAdminOrderCard(order({ paymentRef: "MOCK-SK7F3K9Q2M" }), { kind: "paid", siteUrl: SITE, actions: true });
    expect(mock.text).toContain("🧪 <b>TEST payment</b> (PAYMENT_MODE=mock) — no money was received.");
    expect(checkTelegramHtml(mock.text)).toBeNull();
  });

  it("has ✅ Delivered / ❌ Failed buttons and an admin link", () => {
    const card = buildAdminOrderCard(paid, { kind: "paid", siteUrl: SITE, actions: true });
    expect(card.replyMarkup!.inline_keyboard).toEqual([
      [
        { text: "✅ Delivered", callback_data: "ord:dlv:SK7F3K9Q2M" },
        { text: "❌ Failed", callback_data: "ord:fail:SK7F3K9Q2M" },
      ],
      [{ text: "Open in admin ↗", url: `${SITE}/admin/orders/${paid.id}` }],
    ]);
  });

  it("escapes customer-provided values", () => {
    const evil = order({
      playerName: `<a href="x">pwn</a> & co`,
      packageName: "A<B>",
      contactTelegram: "<script>",
      contactPhone: "0&1",
    });
    const { text } = buildAdminOrderCard(evil, { kind: "details", siteUrl: SITE, actions: true });
    expect(text).toContain("Nickname: &lt;a href=&quot;x&quot;&gt;pwn&lt;/a&gt; &amp; co");
    expect(text).toContain("<b>A&lt;B&gt;</b>");
    expect(text).toContain("Telegram &lt;script&gt;");
    expect(checkTelegramHtml(text)).toBeNull();
  });

  it("flags late payments and shows the failure reason", () => {
    const late = order({ paidAt: new Date("2026-10-13T07:20:00Z") });
    expect(buildAdminOrderCard(late, { kind: "paid", siteUrl: SITE, actions: true }).text).toContain(
      "Paid after the QR expired",
    );
    const failed = buildAdminOrderCard(order({ status: "failed" }), {
      kind: "failed",
      reason: "Supplier <timeout>",
      siteUrl: SITE,
      actions: true,
    });
    expect(failed.text).toContain("❗ <b>Order failed — needs attention</b>\n<i>Supplier &lt;timeout&gt;</i>");
    expect(callbacks(failed)).toEqual(["ord:dlv:SK7F3K9Q2M"]);
  });

  it("the /order card shows the status and delivery time", () => {
    const delivered = order({ status: "delivered", deliveredAt: new Date("2026-10-13T07:09:00Z") });
    const { text } = buildAdminOrderCard(delivered, { kind: "details", siteUrl: SITE, actions: true });
    expect(text.split("\n")[0]).toBe("🧾 <b>Order details</b> · ✅ Delivered");
    expect(text).toContain("✅ Delivered 13 Oct 2026, 14:09");
  });

  it("only offers transitions the order allows", () => {
    const kb = (status: Order["status"], actions = true) =>
      callbacks({ text: "", replyMarkup: adminOrderKeyboard({ ...order(), status }, { siteUrl: SITE, actions }) });
    expect(kb("paid")).toEqual(["ord:dlv:SK7F3K9Q2M", "ord:fail:SK7F3K9Q2M"]);
    expect(kb("processing")).toEqual(["ord:dlv:SK7F3K9Q2M", "ord:fail:SK7F3K9Q2M"]);
    expect(kb("failed")).toEqual(["ord:dlv:SK7F3K9Q2M"]);
    expect(kb("delivered")).toEqual([]);
    expect(kb("pending_payment")).toEqual([]);
    expect(kb("processing", false)).toEqual([]);
  });

  it("leaves out the admin link on localhost (Telegram rejects such buttons)", () => {
    expect(adminOrderKeyboard(order(), { siteUrl: "http://localhost:3000", actions: false })).toBeUndefined();
    const kb = adminOrderKeyboard(order(), { siteUrl: "http://localhost:3000", actions: true })!;
    expect(kb.inline_keyboard).toHaveLength(1);
  });

  it("footers say who did what, when", () => {
    const at = new Date("2026-10-13T07:09:00Z");
    expect(adminActionFooter({ status: "delivered", at, by: "Sokha <3" })).toBe(
      "✅ <b>Delivered</b> by Sokha &lt;3 at 13 Oct, 14:09",
    );
    expect(adminActionFooter({ status: "failed", at, by: "Sokha" })).toBe("❌ <b>Failed</b> by Sokha at 13 Oct, 14:09");
    expect(adminActionFooter({ status: "delivered", at, actor: "admin" })).toContain("via admin panel");
    expect(adminActionFooter({ status: "failed", at, actor: "system", reason: "API down" })).toBe(
      "❌ <b>Failed</b> automatically at 13 Oct, 14:09\n<i>API down</i>",
    );
    expect(adminActionFooter({ status: "processing", at, actor: "admin" })).toContain("Retry started");
  });

  it("explains taps that no longer apply", () => {
    expect(alreadyText("delivered")).toBe("Already delivered");
    expect(alreadyText("refunded")).toBe("Already refunded");
    expect(alreadyText("pending_payment")).toBe("Not possible — order is awaiting payment");
  });

  it("labels channels with an emoji", () => {
    expect(channelLabel("facebook")).toBe("📘 Facebook");
    expect(channelLabel("tiktok")).toBe("🎵 TikTok");
    expect(channelLabel("telegram")).toBe("✈️ Telegram");
    expect(channelLabel("<weird>")).toBe("🌐 &lt;weird&gt;");
  });
});

describe("admin queue & stats", () => {
  it("lists orders with view buttons and an overflow note", () => {
    const items = [order(), order({ code: "SK22223333", status: "failed" })];
    const msg = buildAdminQueue(items, 5, { siteUrl: SITE, now: new Date("2026-10-13T07:30:00Z") });
    expect(msg.text).toContain("Orders to handle</b> · 5");
    expect(msg.text).toContain("⏳ <code>SK7F3K9Q2M</code>");
    expect(msg.text).toContain("❌ <code>SK22223333</code>");
    expect(msg.text).toContain("25m");
    expect(msg.text).toContain("…and 3 more");
    expect(callbacks(msg)).toEqual(["ord:view:SK7F3K9Q2M", "ord:view:SK22223333"]);
    expect(checkTelegramHtml(msg.text)).toBeNull();
    expect(buildAdminQueue([], 0, { siteUrl: SITE }).text).toContain("all caught up");
  });

  it("summarizes today's sales by channel", () => {
    const text = buildAdminStats({
      now: new Date("2026-10-13T07:30:00Z"),
      paidOrdersToday: 12,
      revenueTodayCents: 4520,
      awaitingDelivery: 2,
      failed: 1,
      revenue7dCents: 30000,
      channels: [
        { channel: "tiktok", paidOrders: 5, revenueCents: 2000 },
        { channel: "facebook", paidOrders: 7, revenueCents: 2520 },
        { channel: "google", paidOrders: 0, revenueCents: 0 },
      ],
    });
    expect(text).toContain("📊 <b>Today</b> · 13 Oct (Phnom Penh)");
    expect(text).toContain("Paid orders: <b>12</b>");
    expect(text).toContain("Revenue: <b>$45.20</b>");
    expect(text.indexOf("📘 Facebook — 7 paid · $25.20")).toBeLessThan(text.indexOf("🎵 TikTok — 5 paid · $20.00"));
    expect(text).not.toContain("Google");
    expect(checkTelegramHtml(text)).toBeNull();
  });
});

describe("customer messages", () => {
  const ctx = (s = settings()) => ({ siteUrl: SITE, settings: s });
  const KINDS: CustomerUpdateKind[] = ["paid", "processing", "delivered", "failed", "refunded", "expired", "cancelled"];

  it("every update is valid Telegram HTML in both languages", () => {
    const s = settings({
      social: { facebookUrl: "https://facebook.com/sakai", tiktokUrl: "https://tiktok.com/@sakai" },
      store: { supportTelegram: "sakaisupport", supportPhone: "012 000 111" },
      promo: "follow5",
    });
    for (const locale of ["en", "km"]) {
      for (const kind of KINDS) {
        const msg = buildCustomerUpdate(kind, order({ locale, playerName: "<Nick & Co>" }), ctx(s));
        expect(checkTelegramHtml(msg.text), `${locale}/${kind}`).toBeNull();
        if (["paid", "processing", "delivered"].includes(kind)) expect(msg.text).toContain("<b>&lt;Nick &amp; Co&gt;</b>");
      }
    }
  });

  it("delivered: thanks, top-up-again link, and a follow ask with the follower code", () => {
    const s = settings({
      social: { facebookUrl: "https://facebook.com/sakai", tiktokUrl: "https://tiktok.com/@sakai" },
      promo: "follow5",
    });
    const msg = buildCustomerUpdate("delivered", order(), ctx(s));
    expect(msg.text).toContain("🎉 <b>Top-up delivered!</b>");
    expect(msg.text).toContain("<b>Weekly Diamond Pass</b> has been sent to <b>Dara</b> · ID <code>123456789</code> (1234)");
    expect(msg.text).toContain(
      'Follow us on <a href="https://facebook.com/sakai">Facebook</a> &amp; <a href="https://tiktok.com/@sakai">TikTok</a>',
    );
    expect(msg.text).toContain("<code>FOLLOW5</code>");
    expect(urls(msg)).toEqual([
      `${SITE}/games/mobile-legends?utm_source=telegram&utm_medium=bot&utm_campaign=reorder`,
      "https://facebook.com/sakai",
      "https://tiktok.com/@sakai",
    ]);
  });

  it("delivered without social links skips the follow ask (even with a promo code)", () => {
    const msg = buildCustomerUpdate("delivered", order(), ctx(settings({ promo: "FOLLOW5" })));
    expect(msg.text).not.toContain("Follow us");
    expect(msg.text).not.toContain("FOLLOW5");
    expect(urls(msg)).toHaveLength(1);
  });

  it("only names the networks that are set", () => {
    const msg = buildCustomerUpdate("delivered", order(), ctx(settings({ social: { tiktokUrl: "https://tiktok.com/@sakai" } })));
    expect(msg.text).toContain('Follow us on <a href="https://tiktok.com/@sakai">TikTok</a> for');
  });

  it("delivered in Khmer", () => {
    const s = settings({ social: { facebookUrl: "https://facebook.com/sakai" } });
    const msg = buildCustomerUpdate("delivered", order({ locale: "km" }), ctx(s));
    expect(msg.text).toContain("បញ្ចូលរួចរាល់!");
    expect(msg.text).toContain("តាមដានយើងលើ");
    expect(msg.replyMarkup!.inline_keyboard[0]![0]!.text).toBe("🎮 បញ្ចូលម្តងទៀត");
  });

  it("failed: apology, order code and support contacts", () => {
    const s = settings({
      store: { supportTelegram: "@sakaisupport", supportPhone: "012 000 111" },
      social: { messengerUrl: "https://m.me/sakai" },
    });
    const msg = buildCustomerUpdate("failed", order(), ctx(s));
    expect(msg.text).toContain("We couldn't complete your top-up");
    expect(msg.text).toContain("<code>SK7F3K9Q2M</code>");
    expect(msg.text).toContain(
      '💬 Need help? <a href="https://t.me/sakaisupport">@sakaisupport</a> · <a href="https://m.me/sakai">Messenger</a> · ☎️ 012 000 111',
    );
    expect(urls(msg)).toEqual([`${SITE}/orders/SK7F3K9Q2M`, "https://t.me/sakaisupport"]);
  });

  it("refunded / expired / cancelled", () => {
    expect(buildCustomerUpdate("refunded", order(), ctx()).text).toContain("Order refunded");
    expect(buildCustomerUpdate("expired", order({ locale: "km" }), ctx()).text).toContain("ផុតពេលបង់ប្រាក់");
    const cancelled = buildCustomerUpdate("cancelled", order({ status: "cancelled" }), ctx());
    expect(cancelled.text).toContain("no money was taken");
    expect(urls(cancelled)[0]).toContain("/games/mobile-legends?utm_source=telegram");
  });

  it("linked + status summaries", () => {
    const linked = buildCustomerLinked(order({ promoCode: "TIKTOK5", totalCents: 138 }), ctx());
    expect(linked.text).toContain("You'll get updates here");
    expect(linked.text).toContain("📌 Status: <b>Delivering</b>");
    expect(linked.text).toContain("$1.38</b> · TIKTOK5");
    const pending = buildCustomerStatus(order({ status: "pending_payment", locale: "km" }), ctx());
    expect(pending.text).toContain("រង់ចាំការបង់ប្រាក់");
    expect(pending.replyMarkup!.inline_keyboard[0]![0]!).toEqual({ text: "💳 បង់ប្រាក់ឥឡូវ", url: `${SITE}/orders/SK7F3K9Q2M` });
    const recent = buildRecentOrders([order(), order({ code: "SK33334444", status: "delivered" })], "en");
    expect(recent).toContain("<code>SK33334444</code>");
    expect(recent).toContain("<b>Delivered</b>");
  });

  it("customer buttons disappear on localhost instead of breaking the message", () => {
    const msg = buildCustomerUpdate("paid", order(), { siteUrl: "http://localhost:3000", settings: settings() });
    expect(msg.replyMarkup).toBeUndefined();
  });
});

describe("welcome", () => {
  it("links the website with UTM tags from the /start payload", () => {
    const s = settings({ social: { facebookUrl: "https://facebook.com/sakai" } });
    const msg = buildWelcome("en", { siteUrl: SITE, settings: s }, { payload: "tiktok" });
    expect(msg.text).toContain("Welcome to Sakai Store!");
    expect(msg.text).toContain('<a href="https://sakai.example/?utm_source=tiktok&amp;utm_medium=telegram_bot">sakai.example</a>');
    expect(urls(msg)).toEqual([`${SITE}/?utm_source=tiktok&utm_medium=telegram_bot`, "https://facebook.com/sakai"]);
    expect(checkTelegramHtml(msg.text)).toBeNull();
  });

  it("is in Khmer for Khmer Telegram apps", () => {
    const msg = buildWelcome(localeFromTelegram("km"), { siteUrl: SITE, settings: settings() });
    expect(msg.text).toContain("សូមស្វាគមន៍មកកាន់ Sakai Store!");
    expect(msg.text).toContain(DEFAULT_SETTINGS.store.tagline.km);
  });

  it("maps /start payloads to UTM", () => {
    expect(startUtm("fb")).toEqual({ source: "facebook", medium: "telegram_bot" });
    expect(startUtm("TikTok")).toEqual({ source: "tiktok", medium: "telegram_bot" });
    expect(startUtm("")).toEqual({ source: "telegram", medium: "bot", campaign: "start" });
    expect(startUtm("whatever")).toEqual({ source: "telegram", medium: "bot", campaign: "start" });
    expect(localeFromTelegram("en-US")).toBe("en");
    expect(localeFromTelegram(undefined)).toBe("en");
  });
});
