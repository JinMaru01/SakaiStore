import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

/* Server-render smoke test for the Marketing studio and the playbook page. */

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({ sub: "admin" })),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/marketing",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));

import { insertTestOrder } from "@/lib/admin/test-orders";
import { resetDb, seedCatalog } from "../../../../../tests/helpers/db";
import MarketingStudioPage from "./page";
import PlaybookPage from "./playbook/page";

type Props = { searchParams: Promise<Record<string, string | string[]>> };
const render = async (searchParams: Record<string, string | string[]> = {}) =>
  renderToString(<>{await MarketingStudioPage({ searchParams: Promise.resolve(searchParams) } as Props as never)}</>);

beforeAll(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
  await insertTestOrder({ channel: "tiktok", utmSource: "tiktok", utmCampaign: "bio", status: "delivered", totalCents: 450, promoCode: "TIKTOK5" });
  await insertTestOrder({ channel: "facebook", status: "pending_payment", totalCents: 150 });
});

describe("/admin/marketing", () => {
  it("renders all studio sections for all games", async () => {
    const html = await render();
    expect(html).toContain("Marketing studio");
    expect(html).toContain("Setup checklist");
    expect(html).toContain("All games");
    expect(html).toContain("/api/promo-image/all?format=square");
    expect(html).toContain("Captions &amp; video scripts");
    expect(html).toContain("Tracked links");
    expect(html).toContain("Channel performance");
    expect(html).toContain("TIKTOK5");
    expect(html).toContain("utm_campaign=bio");
  });

  it("renders a selected game with its captions, images and the chosen period", async () => {
    const html = await render({ game: "free-fire", days: "7" });
    // React inserts <!-- --> between adjacent text nodes.
    expect(html).toMatch(/Promo images — (<!-- -->)?Free Fire/);
    expect(html).toContain("/api/promo-image/free-fire?format=story");
    // Khmer captions are the default tab and carry the tracked link.
    expect(html).toContain("តារាងតម្លៃ");
    expect(html).toContain("utm_campaign=free-fire");
    expect(html).toMatch(/aria-current="page"[^>]*>7(<!-- -->)? days/);
  });

  it("falls back to all games for an unknown slug", async () => {
    const html = await render({ game: "../../etc" });
    expect(html).toContain("That game was not found");
  });
});

describe("/admin/marketing/playbook", () => {
  it("renders the playbook with a table of contents", async () => {
    const html = renderToString(<>{await PlaybookPage()}</>);
    expect(html).toContain("Social media playbook");
    expect(html).toContain('id="2-set-up-the-facebook-page"');
    expect(html).toContain('href="#4-meta-pixel-and-domain-verification"');
    expect(html).not.toContain("<script");
  });
});
