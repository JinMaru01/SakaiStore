import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Server-render smoke test for every admin page: builds each page's element
 * tree (async server component) and renders it to HTML, so runtime errors in
 * pages and shared components show up without `next build`.
 */

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({ sub: "admin" })),
  getAdminSession: vi.fn(async () => null),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));
vi.mock("@/lib/notify", () => ({
  notifyOrderPaid: vi.fn(async () => {}),
  notifyOrderStatusChanged: vi.fn(async () => {}),
}));

import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { insertTestOrder } from "@/lib/admin/test-orders";
import { getGameBySlug } from "@/lib/catalog";
import { createOrder, markOrderPaid } from "@/lib/orders/service";
import { resetDb, seedCatalog } from "../../../../tests/helpers/db";
import LoginPage from "../login/page";
import GameEditPage from "./games/[id]/page";
import GameNewPage from "./games/new/page";
import GamesPage from "./games/page";
import PanelLayout from "./layout";
import OrderPage from "./orders/[id]/page";
import OrdersPage from "./orders/page";
import DashboardPage from "./page";
import PromoEditPage from "./promos/[id]/page";
import PromoNewPage from "./promos/new/page";
import PromosPage from "./promos/page";
import SettingsPage from "./settings/page";

type AnyProps = { params?: Promise<Record<string, string>>; searchParams?: Promise<Record<string, string | string[]>> };
const props = (params: Record<string, string> = {}, searchParams: Record<string, string | string[]> = {}) =>
  ({ params: Promise.resolve(params), searchParams: Promise.resolve(searchParams) }) as never as AnyProps;

const render = async (page: (p: never) => Promise<React.ReactNode>, p: AnyProps = props()) =>
  renderToString(<>{await page(p as never)}</>);

let orderId = "";
let gameId = 0;
let promoId = 0;

beforeAll(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
  vi.spyOn(console, "info").mockImplementation(() => {});
  const game = (await getGameBySlug("mobile-legends"))!;
  gameId = game.id;
  const order = await createOrder(
    { gameSlug: game.slug, packageId: game.packages[1]!.id, playerId: "123456789", zoneId: "1234", contactTelegram: "@fox_kh" },
    { attribution: { utmSource: "tiktok", utmCampaign: "launch", landingPath: "/?utm_source=tiktok" } },
  );
  await markOrderPaid(order.id, { actor: "system", ref: "HASH" });
  orderId = order.id;
  await insertTestOrder({ status: "delivered", channel: "facebook", totalCents: 1450, playerName: "<script>x</script>" });
  await insertTestOrder({ status: "failed", channel: "telegram", paidAt: new Date() });
  promoId = (await db.select({ id: promoCodes.id }).from(promoCodes).limit(1))[0]!.id;
});

describe("admin pages render", () => {
  it("dashboard", async () => {
    const html = await render(DashboardPage);
    expect(html).toContain("Needs delivery");
    expect(html).toContain("Revenue, last 14 days");
    expect(html).toContain("123456789");
    expect(html).not.toContain("<script>x</script>");
  });

  it("panel layout with nav badge", async () => {
    const html = renderToString(await PanelLayout({ children: <p>child</p> } as never));
    expect(html).toContain("Games &amp; Prices");
    expect(html).toContain("need action");
    expect(html).toContain("child");
  });

  it("orders list with filters, and an empty result", async () => {
    expect(await render(OrdersPage, props({}, { status: ["processing", "failed"], q: "1234" }))).toContain("Export CSV");
    expect(await render(OrdersPage, props({}, { q: "nothing-matches" }))).toContain("No orders match");
  });

  it("order detail and not-found", async () => {
    const html = await render(OrderPage, props({ id: orderId }));
    expect(html).toContain("Top-up details");
    expect(html).toContain("launch");
    expect(html).toContain("Mark delivered");
    await expect(render(OrderPage, props({ id: "00000000-0000-4000-8000-000000000000" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("games list, new and edit", async () => {
    expect(await render(GamesPage, props({}, { flash: "game_deleted" }))).toContain("Mobile Legends");
    expect(await render(GameNewPage)).toContain("Create game");
    const edit = await render(GameEditPage, props({ id: String(gameId) }));
    expect(edit).toContain("Packages &amp; prices");
    expect(edit).toContain("Weekly Diamond Pass");
    await expect(render(GameEditPage, props({ id: "abc" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("promos list, new and edit", async () => {
    expect(await render(PromosPage)).toContain("FOLLOW10");
    expect(await render(PromoNewPage)).toContain("Create promo code");
    expect(await render(PromoEditPage, props({ id: String(promoId) }))).toContain("Save changes");
  });

  it("settings never shows secrets", async () => {
    const html = await render(SettingsPage);
    expect(html).toContain("Integrations status");
    expect(html).not.toContain("test-admin-password");
    expect(html).not.toContain("test-secret-test-secret");
  });

  it("login", async () => {
    expect(await render(LoginPage, props({}, { next: "/admin/orders" }))).toContain("Sign in");
  });
});
