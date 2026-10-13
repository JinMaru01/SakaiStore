import { describe, expect, it } from "vitest";
import {
  lastDaysWindow,
  lastStoreDays,
  parseStoreDate,
  parseStoreDateTime,
  startOfStoreDay,
  storeDateKey,
  toStoreDateTimeInput,
} from "./time";

describe("Phnom Penh day boundaries (UTC+7)", () => {
  it("starts the local day at 17:00 UTC of the previous UTC day", () => {
    // 2026-10-13 02:00 local = 2026-10-12 19:00 UTC
    expect(startOfStoreDay(new Date("2026-10-12T19:00:00Z")).toISOString()).toBe("2026-10-12T17:00:00.000Z");
    // exactly local midnight
    expect(startOfStoreDay(new Date("2026-10-12T17:00:00Z")).toISOString()).toBe("2026-10-12T17:00:00.000Z");
    // one ms before local midnight belongs to the previous day
    expect(startOfStoreDay(new Date("2026-10-12T16:59:59.999Z")).toISOString()).toBe("2026-10-11T17:00:00.000Z");
  });

  it("keys instants by local date", () => {
    expect(storeDateKey(new Date("2026-10-12T16:59:59Z"))).toBe("2026-10-12");
    expect(storeDateKey(new Date("2026-10-12T17:00:00Z"))).toBe("2026-10-13");
  });

  it("parses date inputs as local midnight and rejects impossible dates", () => {
    expect(parseStoreDate("2026-10-13")?.toISOString()).toBe("2026-10-12T17:00:00.000Z");
    expect(parseStoreDate("2026-02-30")).toBeNull();
    expect(parseStoreDate("13/10/2026")).toBeNull();
    expect(parseStoreDate("")).toBeNull();
    expect(parseStoreDate(null)).toBeNull();
  });

  it("round-trips datetime-local values", () => {
    const d = parseStoreDateTime("2026-10-13T08:30")!;
    expect(d.toISOString()).toBe("2026-10-13T01:30:00.000Z");
    expect(toStoreDateTimeInput(d)).toBe("2026-10-13T08:30");
    expect(parseStoreDateTime("2026-10-13T24:00")).toBeNull();
    expect(parseStoreDateTime("nope")).toBeNull();
    expect(toStoreDateTimeInput(null)).toBe("");
  });

  it("lists the last n local days oldest first", () => {
    const now = new Date("2026-10-13T01:00:00Z"); // 08:00 local on the 13th
    const days = lastStoreDays(3, now);
    expect(days.map((d) => d.key)).toEqual(["2026-10-11", "2026-10-12", "2026-10-13"]);
    expect(days[2]!.start.toISOString()).toBe("2026-10-12T17:00:00.000Z");
  });

  it("builds half-open windows that include today", () => {
    const now = new Date("2026-10-13T01:00:00Z");
    const w = lastDaysWindow(7, now);
    expect(w.from.toISOString()).toBe("2026-10-06T17:00:00.000Z");
    expect(w.to.toISOString()).toBe("2026-10-13T17:00:00.000Z");
  });
});
