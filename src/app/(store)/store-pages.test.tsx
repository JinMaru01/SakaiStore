import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { prerender } from "react-dom/static";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { games } from "@/db/schema";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { resetDb, seedCatalog } from "../../../tests/helpers/db";

/*
 * Integration smoke test: renders the real store pages (server components +
 * client components, as Next does for the first paint) against a seeded test
 * database, in English and Khmer. Next's request APIs are mocked.
 */

const request = vi.hoisted(() => ({ locale: "en" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sk_lang" ? { name, value: request.locale } : undefined),
  }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/lib/notify", () => ({
  notifyOrderPaid: vi.fn(async () => {}),
  notifyOrderStatusChanged: vi.fn(async () => {}),
}));

const { default: StoreLayout } = await import("./layout");
const { default: HomePage, generateMetadata: homeMetadata } = await import("./page");
const { default: GamePage, generateMetadata: gameMetadata } = await import("./games/[slug]/page");
const { default: OrderPage, generateMetadata: orderMetadata } = await import("./orders/[code]/page");
const { default: TrackPage } = await import("./track/page");
const { default: FaqPage } = await import("./faq/page");
const { default: TermsPage } = await import("./terms/page");
const { default: PrivacyPage } = await import("./privacy/page");
const { default: RootNotFound } = await import("../not-found");
const { getGameBySlug } = await import("@/lib/catalog");
const { createOrder, markOrderDelivered, markOrderPaid, markOrderProcessing } = await import("@/lib/orders/service");

/** Raw i18n keys in the markup mean a missing translation. */
const RAW_KEY = /\b(common|home|game|order|track|social|pages)\.[a-z][A-Za-z_]*\.[A-Za-z_.]+/;

async function render(node: React.ReactNode, locale: Locale = "en", withLayout = true): Promise<string> {
  request.locale = locale;
  const tree = (
    <I18nProvider locale={locale} messages={getMessages(locale)} fallback={getMessages("en")}>
      {withLayout ? <StoreLayout params={Promise.resolve({})}>{node}</StoreLayout> : node}
    </I18nProvider>
  );
  // Shell errors (e.g. notFound()) still reject; onError only silences React's console logging.
  const { prelude } = await prerender(tree, { onError: () => {} });
  return new Response(prelude).text();
}

const params = <T,>(p: T) => ({ params: Promise.resolve(p), searchParams: Promise.resolve({}) });

async function newOrder() {
  const game = (await getGameBySlug("mobile-legends"))!;
  const pkg = game.packages.find((p) => p.name === "Weekly Diamond Pass")!;
  return createOrder({ gameSlug: "mobile-legends", packageId: pkg.id, playerId: "123456789", zoneId: "1234" });
}

beforeAll(async () => {
  await resetDb();
  await seedCatalog();
});

beforeEach(() => {
  request.locale = "en";
});

describe.each(["en", "km"] as const)("store pages (%s)", (locale) => {
  it("home: hero, games with 'from' prices, follow-us with promo code, footer", async () => {
    const html = await render(<HomePage />, locale);
    expect(html).toContain("Mobile Legends: Bang Bang");
    expect(html).toContain('href="/games/free-fire"');
    expect(html).toContain("$0.25"); // MLBB "from" price
    expect(html).toContain("FOLLOW10");
    expect(html).toContain("https://www.tiktok.com/@sakaistore");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("ABA");
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('id="games"');
    expect(html).not.toMatch(RAW_KEY);
    if (locale === "km") expect(html).toContain("ហាងបញ្ចូលហ្គេម");
  });

  it("game page: order form with packages and share bar", async () => {
    const html = await render(<GamePage {...params({ slug: "mobile-legends" })} />, locale);
    expect(html).toContain("Weekly Diamond Pass");
    expect(html).toContain("User ID");
    expect(html).toContain("Zone ID");
    expect(html).toContain("data-bottom-bar");
    expect(html).toContain("facebook.com/sharer/sharer.php");
    expect(html).toContain('"@type":"Product"');
    expect(html).not.toMatch(RAW_KEY);
  });

  it("order page: pending KHQR", async () => {
    const order = await newOrder();
    const html = await render(<OrderPage {...params({ code: order.code.toLowerCase() })} />, locale);
    expect(html).toContain(order.code);
    expect(html).toContain("KHQR");
    expect(html).toContain("$1.45");
    expect(html).toMatch(/<path d="M0 0h7/);
    expect(html).not.toMatch(RAW_KEY);
  });

  it.each([TrackPage, FaqPage, TermsPage, PrivacyPage])("static page %#", async (Page) => {
    const html = await render(<Page />, locale);
    expect(html).toContain("<h1");
    expect(html).not.toMatch(RAW_KEY);
  });

  it("root 404 keeps the store chrome", async () => {
    const html = await render(<RootNotFound />, locale, false);
    expect(html).toContain("404");
    expect(html).toContain('href="/track"');
    expect(html).toContain("<footer");
    expect(html).not.toMatch(RAW_KEY);
  });
});

describe("game page", () => {
  it("has SEO metadata with canonical and Open Graph url", async () => {
    const meta = (await gameMetadata(params({ slug: "free-fire" }))) as Metadata;
    expect(meta.title).toBe("Free Fire top-up");
    expect(meta.description).toContain("$0.30");
    expect(meta.alternates?.canonical).toBe("/games/free-fire");
    expect(meta.openGraph).toMatchObject({ url: "/games/free-fire", siteName: "Sakai Store" });
  });

  it("404s for unknown and inactive games", async () => {
    await expect(render(<GamePage {...params({ slug: "nope" })} />)).rejects.toThrow("NEXT_NOT_FOUND");
    await db.update(games).set({ active: false }).where(eq(games.slug, "blood-strike"));
    await expect(render(<GamePage {...params({ slug: "blood-strike" })} />)).rejects.toThrow("NEXT_NOT_FOUND");
    await db.update(games).set({ active: true }).where(eq(games.slug, "blood-strike"));
  });

  it("prefills a promo code from the shared link", async () => {
    const html = await render(
      <GamePage params={Promise.resolve({ slug: "free-fire" })} searchParams={Promise.resolve({ promo: "tiktok5" })} />,
    );
    expect(html).toContain('value="TIKTOK5"');
  });
});

describe("order page", () => {
  it("is never indexed", async () => {
    const meta = (await orderMetadata(params({ code: "SK7F3K9Q2M" }))) as Metadata;
    expect(meta.robots).toMatchObject({ index: false, follow: false });
  });

  it("404s for unknown codes", async () => {
    await expect(render(<OrderPage {...params({ code: "SKZZZZZZZZ" })} />)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(render(<OrderPage {...params({ code: "../../etc" })} />)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows progress once paid, then success with share + follow-us when delivered", async () => {
    const order = await newOrder();
    await markOrderPaid(order.id, { actor: "system", ref: "TEST" });
    await markOrderProcessing(order.id, { actor: "system" });
    let html = await render(<OrderPage {...params({ code: order.code })} />);
    expect(html).toContain("Delivering your top-up");
    expect(html).not.toMatch(/<path d="M0 0h7/); // no QR once paid

    await markOrderDelivered(order.id, { actor: "admin" });
    html = await render(<OrderPage {...params({ code: order.code })} />);
    expect(html).toContain("Top-up delivered!");
    expect(html).toContain('href="/games/mobile-legends"');
    expect(html).toContain("facebook.com/sharer/sharer.php");
    expect(html).toContain("FOLLOW10");
  });
});

describe("home metadata", () => {
  it("sets an absolute title and canonical", async () => {
    const meta = (await homeMetadata()) as Metadata;
    expect(meta.title).toMatchObject({ absolute: expect.stringContaining("Sakai Store") });
    expect(meta.alternates?.canonical).toBe("/");
  });
});
