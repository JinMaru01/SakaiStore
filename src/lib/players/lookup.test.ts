import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { lookupPlayer, mockNickname, type LookupGame } from "./lookup";

const mlbb: LookupGame = {
  slug: "mobile-legends",
  idPattern: "^\\d{5,12}$",
  requiresZone: true,
  zonePattern: "^\\d{3,6}$",
  zoneOptions: null,
};

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
});

describe("lookupPlayer", () => {
  it("returns a deterministic nickname in mock mode", async () => {
    const a = await lookupPlayer(mlbb, "123456789", "1234");
    const b = await lookupPlayer(mlbb, " 123 456 789 ", "1234");
    expect(a).toEqual({ ok: true, playerName: mockNickname("123456789") });
    expect(b).toEqual(a);
    expect(mockNickname("123456789")).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+_\d{1,2}$/);
    expect(mockNickname("123456788")).not.toBe(mockNickname("123456789"));
  });

  it("returns not_found for ids ending in 000 (mock test hook)", async () => {
    expect(await lookupPlayer(mlbb, "123456000", "1234")).toEqual({ ok: false, error: "not_found" });
  });

  it("rejects invalid ids and zones", async () => {
    expect(await lookupPlayer(mlbb, "abc", "1234")).toEqual({ ok: false, error: "invalid_id" });
    expect(await lookupPlayer(mlbb, "123456789")).toEqual({ ok: false, error: "invalid_id" });
  });

  it("only validates the format in none mode", async () => {
    vi.stubEnv("PLAYER_LOOKUP_MODE", "none");
    resetEnvCache();
    expect(await lookupPlayer(mlbb, "123456000", "1234")).toEqual({ ok: true, playerName: null });
    expect(await lookupPlayer(mlbb, "x", "1234")).toEqual({ ok: false, error: "invalid_id" });
  });
});
