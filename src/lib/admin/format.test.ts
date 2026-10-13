import { describe, expect, it } from "vitest";
import { formatAge, formatAgo, formatDateTime, formatPercent, formatUsdCompact, niceCeiling } from "./format";

describe("admin formatting", () => {
  it("formats dates in Phnom Penh time", () => {
    expect(formatDateTime(new Date("2026-10-12T17:05:00Z"))).toBe("13 Oct 2026, 00:05");
    expect(formatDateTime(null)).toBe("—");
  });

  it("formats ages compactly", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    expect(formatAge(new Date("2026-10-13T11:59:30Z"), now)).toBe("just now");
    expect(formatAge(new Date("2026-10-13T11:45:00Z"), now)).toBe("15m");
    expect(formatAge(new Date("2026-10-13T09:30:00Z"), now)).toBe("2h 30m");
    expect(formatAge(new Date("2026-10-10T12:00:00Z"), now)).toBe("3d");
    expect(formatAgo(new Date("2026-10-13T11:59:30Z"), now)).toBe("just now");
    expect(formatAgo(new Date("2026-10-13T11:45:00Z"), now)).toBe("15m ago");
  });

  it("formats percentages and compact money", () => {
    expect(formatPercent(0.8)).toBe("80%");
    expect(formatPercent(0.4256)).toBe("42.6%");
    expect(formatPercent(null)).toBe("—");
    expect(formatUsdCompact(0)).toBe("$0");
    expect(formatUsdCompact(1250)).toBe("$12.50");
    expect(formatUsdCompact(125_000)).toBe("$1,250");
    expect(formatUsdCompact(1_250_000)).toBe("$12.5K");
    expect(formatUsdCompact(2_000_000)).toBe("$20K");
  });

  it("rounds axis maxima up to nice numbers", () => {
    expect(niceCeiling(0)).toBe(0);
    expect(niceCeiling(87)).toBe(100);
    expect(niceCeiling(1450)).toBe(2000);
    expect(niceCeiling(2100)).toBe(2500);
    expect(niceCeiling(4999)).toBe(5000);
    expect(niceCeiling(5001)).toBe(10000);
  });
});
