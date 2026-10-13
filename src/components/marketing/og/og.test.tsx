import { describe, expect, it } from "vitest";
import { GameOgCard, OG_SIZE, SiteOgCard } from "./cards";
import { renderPng } from "./render";

/*
 * Renders the Satori cards to real PNGs. Satori throws on unsupported markup
 * (e.g. a multi-child <div> without display:flex), so this catches layout
 * regressions that type checks cannot.
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

async function png(res: Response) {
  expect(res.headers.get("content-type")).toBe("image/png");
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect([...bytes.slice(0, 4)]).toEqual(PNG_SIGNATURE);
  // IHDR width/height (big-endian) at bytes 16..23.
  const view = new DataView(bytes.buffer);
  return { width: view.getUint32(16), height: view.getUint32(20), size: bytes.length };
}

const GAMES = [
  { name: "Mobile Legends: Bang Bang", currencyName: "Diamonds", accentColor: "#3b6cff" },
  { name: "Free Fire", currencyName: "Diamonds", accentColor: "#ff7a00" },
  { name: "PUBG Mobile", currencyName: "UC", accentColor: "#f2a900" },
  { name: "Honor of Kings", currencyName: "Tokens", accentColor: "#c9a227" },
  { name: "Call of Duty: Mobile", currencyName: "CP", accentColor: "#8bc34a" },
  { name: "🔥 ហ្គេម Khmer", currencyName: "ពេជ្រ", accentColor: "javascript:alert(1)" },
];

describe("Open Graph cards", () => {
  it("renders the site card", { timeout: 30_000 }, async () => {
    const res = await renderPng(
      <SiteOgCard storeName="Sakai Store" tagline="Fast & cheap game top-up in Cambodia" games={GAMES} host="sakaistore.com" />,
      OG_SIZE,
    );
    const info = await png(res);
    expect(info).toMatchObject({ width: 1200, height: 630 });
    expect(info.size).toBeGreaterThan(10_000);
  });

  it("renders a game card with sale prices and hostile input", { timeout: 30_000 }, async () => {
    const res = await renderPng(
      <GameOgCard
        game={{ name: "Mobile Legends: Bang Bang", currencyName: "Diamonds", accentColor: "#3b6cff" }}
        minPriceCents={25}
        packages={[
          { name: "Weekly Diamond Pass", priceCents: 145, badge: "hot" },
          { name: "86 Diamonds", priceCents: 150, compareAtCents: 180, badge: "best" },
          { name: "172 Diamonds 🔥", priceCents: 295 },
          { name: "ពេជ្រ 257", priceCents: 435 },
        ]}
        storeName="Sakai Store"
        host="sakaistore.com"
      />,
      { ...OG_SIZE, headers: { "cache-control": "public, max-age=60" } },
    );
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
    expect(await png(res)).toMatchObject({ width: 1200, height: 630 });
  });
});
