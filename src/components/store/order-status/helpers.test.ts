import { create } from "qrcode";
import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatDateTime,
  isPurchaseStatus,
  POLL_INTERVAL_MS,
  pollIntervalFor,
  qrPath,
  remainingMs,
  SLOW_POLL_INTERVAL_MS,
} from "./helpers";

describe("pollIntervalFor", () => {
  it("polls fast while payment or delivery is in progress", () => {
    for (const s of ["pending_payment", "paid", "processing"] as const) expect(pollIntervalFor(s)).toBe(POLL_INTERVAL_MS);
  });
  it("polls slowly for failed orders (an admin may retry)", () => {
    expect(pollIntervalFor("failed")).toBe(SLOW_POLL_INTERVAL_MS);
  });
  it("stops on final statuses", () => {
    for (const s of ["delivered", "refunded", "expired", "cancelled"] as const) expect(pollIntervalFor(s)).toBeNull();
  });
});

describe("isPurchaseStatus", () => {
  it("is true once money is received and the order is healthy", () => {
    expect(isPurchaseStatus("paid")).toBe(true);
    expect(isPurchaseStatus("processing")).toBe(true);
    expect(isPurchaseStatus("delivered")).toBe(true);
    expect(isPurchaseStatus("pending_payment")).toBe(false);
    expect(isPurchaseStatus("refunded")).toBe(false);
    expect(isPurchaseStatus("expired")).toBe(false);
  });
});

describe("countdown", () => {
  it("formats remaining time", () => {
    expect(formatCountdown(15 * 60_000)).toBe("15:00");
    expect(formatCountdown(61_001)).toBe("01:02");
    expect(formatCountdown(999)).toBe("00:01");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5000)).toBe("00:00");
    expect(formatCountdown(3_661_000)).toBe("1:01:01");
  });

  it("computes remaining ms from an ISO timestamp", () => {
    const now = Date.parse("2026-10-13T10:00:00.000Z");
    expect(remainingMs("2026-10-13T10:15:00.000Z", now)).toBe(15 * 60_000);
    expect(remainingMs(null, now)).toBeNull();
    expect(remainingMs("garbage", now)).toBeNull();
  });
});

describe("formatDateTime", () => {
  it("formats in Cambodia time (UTC+7)", () => {
    expect(formatDateTime("2026-10-13T17:05:00.000Z")).toBe("14/10/2026 00:05");
    expect(formatDateTime("2026-01-02T03:04:00.000Z")).toBe("02/01/2026 10:04");
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime("nope")).toBe("");
  });
});

describe("qrPath", () => {
  it("merges horizontal runs of dark modules", () => {
    const grid = [
      [1, 1, 0],
      [0, 1, 1],
      [1, 0, 1],
    ];
    expect(qrPath(3, (r, c) => grid[r]![c]!)).toBe("M0 0h2v1h-2zM1 1h2v1h-2zM0 2h1v1h-1zM2 2h1v1h-1z");
  });

  it("draws a real KHQR payload", () => {
    const qr = create("00020101021229180014sakai_test@aclb5204599953038405405" + "1.505802KH6011Sakai Store6010Phnom Penh6304ABCD", {
      errorCorrectionLevel: "Q",
    });
    const d = qrPath(qr.modules.size, (r, c) => qr.modules.get(r, c));
    expect(d.startsWith("M0 0h7")).toBe(true); // top-left finder pattern
    expect(d).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/);
  });
});
