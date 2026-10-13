import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  escapeLike,
  orderFiltersToQuery,
  parseOrderFilters,
  phoneSearchDigits,
} from "./order-filters";

describe("parseOrderFilters", () => {
  it("parses repeated and comma-separated statuses, keeping only known ones", () => {
    const f = parseOrderFilters({ status: ["failed", "paid,processing", "hacked"] });
    expect(f.statuses).toEqual(["paid", "processing", "failed"]);
  });

  it("works with URLSearchParams", () => {
    const f = parseOrderFilters(new URLSearchParams("status=paid&game=Free-Fire&channel=TikTok&page=3"));
    expect(f).toMatchObject({ statuses: ["paid"], game: "free-fire", channel: "tiktok", page: 3 });
  });

  it("rejects invalid values", () => {
    const f = parseOrderFilters({
      game: "../etc",
      channel: "myspace",
      from: "2026-02-31",
      to: "yesterday",
      page: "-4",
    });
    expect(f).toEqual({ ...EMPTY_FILTERS, page: 1 });
  });

  it("swaps a reversed date range", () => {
    const f = parseOrderFilters({ from: "2026-10-13", to: "2026-10-01" });
    expect([f.from, f.to]).toEqual(["2026-10-01", "2026-10-13"]);
  });

  it("trims, strips control chars and caps the search", () => {
    const f = parseOrderFilters({ q: `  sk7f\u0000${"x".repeat(100)}  ` });
    expect(f.q).toBe(`sk7f${"x".repeat(60)}`);
    expect(parseOrderFilters({ q: "   " }).q).toBeNull();
  });

  it("caps the page number", () => {
    expect(parseOrderFilters({ page: "99999999" }).page).toBe(10_000);
    expect(parseOrderFilters({ page: "abc" }).page).toBe(1);
  });
});

describe("orderFiltersToQuery", () => {
  it("round-trips through the parser", () => {
    const filters = {
      statuses: ["paid", "failed"] as const,
      game: "mobile-legends",
      channel: "facebook" as const,
      from: "2026-10-01",
      to: "2026-10-13",
      q: "@fox",
    };
    const qs = orderFiltersToQuery({ ...filters, statuses: [...filters.statuses] }, 2);
    expect(qs).toBe(
      "q=%40fox&status=paid&status=failed&game=mobile-legends&channel=facebook&from=2026-10-01&to=2026-10-13&page=2",
    );
    const parsed = parseOrderFilters(new URLSearchParams(qs));
    expect(parsed).toEqual({ ...filters, statuses: ["paid", "failed"], page: 2 });
  });

  it("omits empty filters and page 1", () => {
    expect(orderFiltersToQuery(EMPTY_FILTERS, 1)).toBe("");
  });
});

describe("helpers", () => {
  it("counts active filter groups", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, statuses: ["paid", "failed"], from: "2026-10-01", q: "x" })).toBe(3);
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });

  it("normalizes Cambodian phone numbers for search", () => {
    expect(phoneSearchDigits("+855 12 345 678")).toBe("12345678");
    expect(phoneSearchDigits("012-345-678")).toBe("12345678");
    expect(phoneSearchDigits("12345678")).toBe("12345678");
    expect(phoneSearchDigits("SK7F")).toBe("7");
  });
});
