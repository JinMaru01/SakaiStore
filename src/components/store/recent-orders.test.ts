import { describe, expect, it } from "vitest";
import {
  addRecentOrder,
  hasRecentOrder,
  MAX_RECENT_ORDERS,
  normalizeOrderCode,
  parsePlayerMemory,
  parseRecentOrders,
  type RecentOrder,
} from "./recent-orders";

describe("normalizeOrderCode", () => {
  it.each([
    ["sk7f3k9q2m", "SK7F3K9Q2M"],
    ["  SK7F3K9Q2M ", "SK7F3K9Q2M"],
    ["#SK7F3K9Q2M", "SK7F3K9Q2M"],
    ["SK7F 3K9Q-2M", "SK7F3K9Q2M"],
  ])("normalizes %j", (input, expected) => {
    expect(normalizeOrderCode(input)).toBe(expected);
  });

  it.each(["", "abc", "SK7F3K9Q2M!", "../admin", "x".repeat(20), null, undefined])("rejects %j", (input) => {
    expect(normalizeOrderCode(input)).toBeNull();
  });
});

describe("parseRecentOrders", () => {
  it("tolerates missing, corrupt and non-array data", () => {
    expect(parseRecentOrders(null)).toEqual([]);
    expect(parseRecentOrders("{nope")).toEqual([]);
    expect(parseRecentOrders('{"code":"SK7F3K9Q2M"}')).toEqual([]);
  });

  it("accepts legacy plain-string entries and objects, dropping invalid ones and duplicates", () => {
    const raw = JSON.stringify([
      "sk7f3k9q2m",
      { code: "SKAAAAAAAA", gameName: "Free Fire", totalCents: 100, createdAt: "2026-10-13T00:00:00.000Z" },
      { code: "SK7F3K9Q2M" },
      { code: "<script>" },
      42,
      null,
      { code: "SKBBBBBBBB", totalCents: "1" },
    ]);
    expect(parseRecentOrders(raw)).toEqual([
      { code: "SK7F3K9Q2M" },
      { code: "SKAAAAAAAA", gameName: "Free Fire", totalCents: 100, createdAt: "2026-10-13T00:00:00.000Z" },
      { code: "SKBBBBBBBB" },
    ]);
  });

  it(`caps the list at ${MAX_RECENT_ORDERS}`, () => {
    const raw = JSON.stringify(Array.from({ length: 15 }, (_, i) => `SKCODE${String(i).padStart(4, "0")}`));
    expect(parseRecentOrders(raw)).toHaveLength(MAX_RECENT_ORDERS);
  });
});

describe("addRecentOrder", () => {
  const list: RecentOrder[] = [{ code: "SKAAAAAAAA" }, { code: "SKBBBBBBBB" }];

  it("puts the new order first and de-duplicates", () => {
    expect(addRecentOrder(list, { code: "skbbbbbbbb", gameName: "PUBG" }).map((o) => o.code)).toEqual([
      "SKBBBBBBBB",
      "SKAAAAAAAA",
    ]);
  });

  it(`keeps at most ${MAX_RECENT_ORDERS} entries`, () => {
    let l: RecentOrder[] = [];
    for (let i = 0; i < 12; i++) l = addRecentOrder(l, { code: `SKCODE${String(i).padStart(4, "0")}` });
    expect(l).toHaveLength(MAX_RECENT_ORDERS);
    expect(l[0]!.code).toBe("SKCODE0011");
  });

  it("ignores invalid codes", () => {
    expect(addRecentOrder(list, { code: "bad!" })).toEqual(list);
  });

  it("round-trips through JSON", () => {
    const next = addRecentOrder(list, { code: "SKCCCCCCCC", totalCents: 250 });
    expect(parseRecentOrders(JSON.stringify(next))).toEqual(next);
    expect(hasRecentOrder(JSON.stringify(next), "SKCCCCCCCC")).toBe(true);
    expect(hasRecentOrder(JSON.stringify(next), "SKDDDDDDDD")).toBe(false);
  });
});

describe("parsePlayerMemory", () => {
  it("parses the remembered id and zone", () => {
    expect(parsePlayerMemory('{"playerId":"123456789","zoneId":"1234"}')).toEqual({
      playerId: "123456789",
      zoneId: "1234",
    });
    expect(parsePlayerMemory('{"playerId":"123456789"}')).toEqual({ playerId: "123456789", zoneId: "" });
  });

  it("returns null for empty or corrupt values", () => {
    expect(parsePlayerMemory(null)).toBeNull();
    expect(parsePlayerMemory("oops")).toBeNull();
    expect(parsePlayerMemory('{"playerId":""}')).toBeNull();
    expect(parsePlayerMemory('{"playerId":5}')).toBeNull();
  });
});
