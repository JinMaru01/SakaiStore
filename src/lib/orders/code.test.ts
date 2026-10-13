import { describe, expect, it } from "vitest";
import { generateOrderCode, normalizeOrderCode, ORDER_CODE_ALPHABET } from "./code";

describe("order codes", () => {
  it("are SK + 8 unambiguous uppercase characters", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateOrderCode();
      expect(code).toMatch(/^SK[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
      expect(code.slice(2)).not.toMatch(/[01OIL]/);
    }
    expect(ORDER_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("are random enough not to collide in a large sample", () => {
    const codes = new Set(Array.from({ length: 10_000 }, generateOrderCode));
    expect(codes.size).toBe(10_000);
  });

  it("normalizes user input", () => {
    expect(normalizeOrderCode(" sk7f3k9q2m ")).toBe("SK7F3K9Q2M");
    expect(normalizeOrderCode("#SK7F3K9Q2M")).toBe("SK7F3K9Q2M");
    expect(normalizeOrderCode("SK7F3K9Q2")).toBeNull();
    expect(normalizeOrderCode("SK7F3K9Q20")).toBeNull(); // 0 is not in the alphabet
    expect(normalizeOrderCode("'; drop table orders;--")).toBeNull();
    expect(normalizeOrderCode(undefined)).toBeNull();
  });
});
