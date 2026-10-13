import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb, seedCatalog } from "../../../tests/helpers/db";
import { EMPTY_FILTERS, parseOrderFilters, type OrderFilters } from "./order-filters";
import {
  listAdminOrders,
  listOrderGameOptions,
  listOrdersForExport,
  ordersToCsv,
} from "./orders";
import { insertTestOrder } from "./test-orders";

const f = (over: Partial<OrderFilters>): OrderFilters => ({ ...EMPTY_FILTERS, ...over });
const codes = async (filters: OrderFilters) => (await listAdminOrders(filters, 1, 100)).rows.map((r) => r.code).sort();

beforeEach(async () => {
  await resetDb();
});

describe("listAdminOrders filters", () => {
  it("filters by status, game and channel", async () => {
    const a = await insertTestOrder({ status: "paid", channel: "facebook" });
    const b = await insertTestOrder({ status: "failed", channel: "tiktok", gameSlug: "free-fire", gameName: "Free Fire" });
    await insertTestOrder({ status: "delivered", channel: "facebook" });

    expect(await codes(f({ statuses: ["paid", "failed"] }))).toEqual([a.code, b.code].sort());
    expect(await codes(f({ game: "free-fire" }))).toEqual([b.code]);
    expect(await codes(f({ channel: "facebook", statuses: ["paid"] }))).toEqual([a.code]);
  });

  it("uses inclusive Phnom Penh days for the date range", async () => {
    // 2026-10-12 23:59 local / 2026-10-13 00:00 local / 2026-10-13 23:59 local / 2026-10-14 00:00 local
    const late12 = await insertTestOrder({ createdAt: new Date("2026-10-12T16:59:00Z") });
    const start13 = await insertTestOrder({ createdAt: new Date("2026-10-12T17:00:00Z") });
    const end13 = await insertTestOrder({ createdAt: new Date("2026-10-13T16:59:59Z") });
    const start14 = await insertTestOrder({ createdAt: new Date("2026-10-13T17:00:00Z") });

    expect(await codes(f({ from: "2026-10-13", to: "2026-10-13" }))).toEqual([start13.code, end13.code].sort());
    expect(await codes(f({ from: "2026-10-13" }))).toEqual([start13.code, end13.code, start14.code].sort());
    expect(await codes(f({ to: "2026-10-12" }))).toEqual([late12.code]);
  });

  it("searches order code, player id, player name, phone and telegram", async () => {
    const byPlayer = await insertTestOrder({ playerId: "987654321", playerName: "ShadowFox_42" });
    const byPhone = await insertTestOrder({ contactPhone: "+855 12 345 678" });
    const byTelegram = await insertTestOrder({ contactTelegram: "sokha_kh" });
    await insertTestOrder({ playerId: "111111111" });

    expect(await codes(f({ q: "98765" }))).toEqual([byPlayer.code]);
    expect(await codes(f({ q: "shadowfox" }))).toEqual([byPlayer.code]);
    expect(await codes(f({ q: byPhone.code.toLowerCase() }))).toEqual([byPhone.code]);
    expect(await codes(f({ q: `#${byPhone.code}` }))).toEqual([byPhone.code]);
    // Phone typed in local format matches the stored international one.
    expect(await codes(f({ q: "012 345 678" }))).toEqual([byPhone.code]);
    expect(await codes(f({ q: "@Sokha_KH" }))).toEqual([byTelegram.code]);
  });

  it("treats LIKE wildcards in the search literally", async () => {
    await insertTestOrder({ playerName: "abc" });
    const literal = await insertTestOrder({ playerName: "50%_off" });
    expect(await codes(f({ q: "%" }))).toEqual([literal.code]);
    expect(await codes(f({ q: "_" }))).toEqual([literal.code]);
  });

  it("paginates newest first and reports totals", async () => {
    for (let i = 0; i < 7; i++) {
      await insertTestOrder({ createdAt: new Date(Date.UTC(2026, 9, 1 + i)) });
    }
    const page1 = await listAdminOrders(EMPTY_FILTERS, 1, 3);
    const page3 = await listAdminOrders(EMPTY_FILTERS, 3, 3);
    expect(page1).toMatchObject({ total: 7, pageCount: 3, page: 1, pageSize: 3 });
    expect(page1.rows.map((r) => r.createdAt.getUTCDate())).toEqual([7, 6, 5]);
    expect(page3.rows.map((r) => r.createdAt.getUTCDate())).toEqual([1]);
    expect((await listAdminOrders(EMPTY_FILTERS, 9, 3)).rows).toEqual([]);
  });

  it("returns one page for no results", async () => {
    expect(await listAdminOrders(EMPTY_FILTERS)).toMatchObject({ rows: [], total: 0, pageCount: 1 });
  });
});

describe("export", () => {
  it("exports the same filtered orders, oldest first, as guarded CSV", async () => {
    await insertTestOrder({ status: "delivered", createdAt: new Date("2026-10-12T17:00:00Z") });
    await insertTestOrder({
      status: "paid",
      playerName: "=HYPERLINK(\"http://evil\")",
      contactTelegram: "@x",
      totalCents: 1450,
      discountCents: 50,
      unitPriceCents: 1500,
      channel: "tiktok",
      utmSource: "tiktok",
      utmCampaign: "launch, oct",
      createdAt: new Date("2026-10-13T01:02:03Z"),
    });
    await insertTestOrder({ status: "cancelled" });

    const rows = await listOrdersForExport(parseOrderFilters({ status: ["paid", "delivered"] }));
    expect(rows.map((r) => r.status)).toEqual(["delivered", "paid"]);

    const lines = ordersToCsv(rows).split("\r\n");
    expect(lines[0]!.startsWith("order_code,created_at_ict,status,game,")).toBe(true);
    expect(lines).toHaveLength(4); // header + 2 rows + trailing empty
    const paid = lines[2]!;
    expect(paid).toContain("2026-10-13 08:02:03"); // ICT
    expect(paid).toContain(",15.00,0.50,14.50,USD,");
    expect(paid).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(paid).toContain("'@x");
    expect(paid).toContain('"launch, oct"');
  });

  it("caps the export size", async () => {
    for (let i = 0; i < 3; i++) await insertTestOrder();
    expect(await listOrdersForExport(EMPTY_FILTERS, 2)).toHaveLength(2);
  });
});

describe("listOrderGameOptions", () => {
  it("lists catalog games plus games only present on old orders", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await seedCatalog();
    log.mockRestore();
    await insertTestOrder({ gameSlug: "retired-game", gameName: "Retired Game" });
    await insertTestOrder({ gameSlug: "mobile-legends" });
    const options = await listOrderGameOptions();
    expect(options[0]).toEqual({ slug: "mobile-legends", name: "Mobile Legends: Bang Bang" });
    expect(options.filter((o) => o.slug === "mobile-legends")).toHaveLength(1);
    expect(options.at(-1)).toEqual({ slug: "retired-game", name: "Retired Game" });
  });
});
