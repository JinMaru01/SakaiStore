import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type { PublicOrder } from "@/lib/orders/public";
import type { OrderStatus } from "@/lib/orders/status";

/*
 * Server-render the main client views (as Next does for the first paint) in
 * both languages. Catches render-time crashes and untranslated keys leaking
 * into the markup (the translator falls back to the raw key).
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/games/mobile-legends",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { OrderForm } = await import("./order-form/order-form");
const { OrderView } = await import("./order-status/order-view");
const { TrackForm, RecentOrders } = await import("./track-order");

function render(node: React.ReactNode, locale: Locale) {
  return renderToStaticMarkup(
    <I18nProvider locale={locale} messages={getMessages(locale)} fallback={getMessages("en")}>
      {node}
    </I18nProvider>,
  );
}

/** Raw i18n keys in the output mean a missing translation. */
const RAW_KEY = /\b(common|home|game|order|track|social|pages)\.[a-z][A-Za-z_]*\.[A-Za-z_.]+/;

const GAME = {
  slug: "mobile-legends",
  name: "Mobile Legends: Bang Bang",
  currencyName: "Diamonds",
  accentColor: "#3b6cff",
  imageUrl: null,
  idLabel: "User ID",
  idPattern: "^\\d{5,12}$",
  idHelp: "Open your profile in-game.",
  requiresZone: true,
  zoneLabel: "Zone ID",
  zonePattern: "^\\d{3,6}$",
  zoneOptions: null,
};
const PACKAGES = [
  { id: 1, name: "Weekly Diamond Pass", amount: 0, bonus: 0, priceCents: 145, compareAtCents: null, badge: "hot" },
  { id: 2, name: "86 Diamonds", amount: 78, bonus: 8, priceCents: 150, compareAtCents: 175, badge: "best" },
  { id: 3, name: "172 Diamonds", amount: 156, bonus: 16, priceCents: 295, compareAtCents: null, badge: "Limited" },
];

const KHQR =
  "00020101021229180014sakai_test@aclb520459995303840540415005802KH5911Sakai Store6010Phnom Penh62140110SK7F3K9Q2M6304ABCD";

function order(status: OrderStatus, extra: Partial<PublicOrder> = {}): PublicOrder {
  return {
    code: "SK7F3K9Q2M",
    status,
    gameSlug: "mobile-legends",
    gameName: "Mobile Legends: Bang Bang",
    packageName: "86 Diamonds",
    playerId: "123456789",
    zoneId: "1234",
    playerName: "ShadowFox_42",
    unitPriceCents: 150,
    discountCents: 15,
    totalCents: 135,
    currency: "USD",
    promoCode: "FOLLOW10",
    khqr: status === "pending_payment" ? KHQR : null,
    paymentExpiresAt: "2026-10-13T10:15:00.000Z",
    paidAt: null,
    deliveredAt: null,
    createdAt: "2026-10-13T10:00:00.000Z",
    paymentMode: "mock",
    telegramLink: "https://t.me/sakai_bot?start=ord_SK7F3K9Q2M",
    telegramLinked: false,
    timeline: [{ type: "created", at: "2026-10-13T10:00:00.000Z" }],
    ...extra,
  };
}

const CHAT = { messenger: "https://m.me/sakaistore", telegram: "https://t.me/sakaisupport" };
const SHARE = { url: "https://sakai.example/games/mobile-legends", text: "Top up", title: "MLBB top-up" };

describe.each(["en", "km"] as const)("storefront views (%s)", (locale) => {
  it("renders the order form with packages, badges, KHR prices and the mobile pay bar", () => {
    const html = render(
      <OrderForm game={GAME} packages={PACKAGES} khrPerUsd={4100} followCode="FOLLOW10" initialPromo="fb5" />,
      locale,
    );
    expect(html).toContain("86 Diamonds");
    expect(html).toContain("$1.50");
    expect(html).toContain("6,200៛"); // ≈ KHR at 4100/USD, rounded to 100៛
    expect(html).toContain("Limited"); // free-text badge passes through
    expect(html).toContain('type="radio"');
    expect(html).toContain("data-bottom-bar");
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('value="FB5"'); // promo from the shared link
    expect(html).toContain('form="order-form"');
    expect(html).not.toMatch(RAW_KEY);
  });

  it.each(["pending_payment", "paid", "processing", "delivered", "failed", "refunded", "expired", "cancelled"] as const)(
    "renders an order that is %s",
    (status) => {
      const html = render(
        <OrderView
          initialOrder={order(status, status === "delivered" ? { paidAt: "2026-10-13T10:02:00.000Z", deliveredAt: "2026-10-13T10:05:00.000Z" } : {})}
          merchantName="Sakai Store"
          khrPerUsd={4100}
          chat={CHAT}
          share={SHARE}
          followUs={<div id="follow-slot" />}
        />,
        locale,
      );
      expect(html).toContain("SK7F3K9Q2M");
      expect(html).toContain("$1.35");
      expect(html).toContain("FOLLOW10");
      expect(html).not.toMatch(RAW_KEY);
      if (status === "pending_payment") {
        expect(html).toContain("KHQR");
        expect(html).toMatch(/<path d="M0 0h7/); // QR drawn server-side
        expect(html).toContain("--:--"); // countdown fills in after hydration
      }
      if (status === "delivered") {
        expect(html).toContain("follow-slot");
        expect(html).toContain("facebook.com/sharer");
        expect(html).toContain("/games/mobile-legends");
      }
      if (status === "failed") expect(html).toContain("https://t.me/sakaisupport");
    },
  );

  it("renders the track page widgets", () => {
    const html = render(
      <>
        <TrackForm />
        <RecentOrders />
      </>,
      locale,
    );
    expect(html).toContain('id="orderCode"');
    expect(html).not.toMatch(RAW_KEY);
  });
});
