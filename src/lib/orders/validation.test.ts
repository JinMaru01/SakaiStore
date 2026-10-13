import { describe, expect, it, vi } from "vitest";
import {
  compileSafePattern,
  normalizePlayerId,
  normalizeZoneId,
  validatePlayer,
  type PlayerGameRules,
} from "./validation";

const mlbb: PlayerGameRules = {
  idPattern: "^\\d{5,12}$",
  requiresZone: true,
  zonePattern: "^\\d{3,6}$",
  zoneOptions: null,
};
const freeFire: PlayerGameRules = { idPattern: "^\\d{6,12}$", requiresZone: false, zonePattern: null, zoneOptions: null };
const genshin: PlayerGameRules = {
  idPattern: "^\\d{9,10}$",
  requiresZone: true,
  zonePattern: null,
  zoneOptions: [
    { value: "os_asia", label: "Asia" },
    { value: "os_usa", label: "America" },
  ],
};

describe("normalize", () => {
  it("trims and removes inner and invisible whitespace", () => {
    expect(normalizePlayerId(" 1234 5678 ")).toBe("12345678");
    expect(normalizePlayerId("1234​5678﻿")).toBe("12345678");
    expect(normalizePlayerId(undefined)).toBe("");
    expect(normalizeZoneId(" (1234) ")).toBe("1234");
  });
});

describe("validatePlayer", () => {
  it("accepts valid ids and zones", () => {
    expect(validatePlayer(mlbb, " 123 456 789 ", " 1234 ")).toEqual({ ok: true, playerId: "123456789", zoneId: "1234" });
    expect(validatePlayer(freeFire, "1234567")).toEqual({ ok: true, playerId: "1234567", zoneId: null });
  });

  it("rejects ids that do not match the game's pattern", () => {
    expect(validatePlayer(mlbb, "abc", "1234")).toEqual({ ok: false, error: "invalid_id", field: "playerId" });
    expect(validatePlayer(mlbb, "1234", "1234")).toMatchObject({ error: "invalid_id" });
    expect(validatePlayer(freeFire, "")).toMatchObject({ error: "invalid_id" });
    expect(validatePlayer(freeFire, "1".repeat(65))).toMatchObject({ error: "invalid_id" });
  });

  it("requires a zone when the game needs one", () => {
    expect(validatePlayer(mlbb, "123456789")).toEqual({ ok: false, error: "invalid_zone", field: "zoneId" });
    expect(validatePlayer(mlbb, "123456789", "12")).toMatchObject({ error: "invalid_zone" });
  });

  it("splits a pasted 'id (zone)' value", () => {
    expect(validatePlayer(mlbb, "123456789 (1234)")).toEqual({ ok: true, playerId: "123456789", zoneId: "1234" });
  });

  it("drops a zone for games without zones", () => {
    expect(validatePlayer(freeFire, "1234567", "999")).toEqual({ ok: true, playerId: "1234567", zoneId: null });
  });

  it("checks zoneOptions values", () => {
    expect(validatePlayer(genshin, "812345678", "os_asia")).toEqual({ ok: true, playerId: "812345678", zoneId: "os_asia" });
    expect(validatePlayer(genshin, "812345678", "OS_USA")).toMatchObject({ ok: true, zoneId: "os_usa" });
    expect(validatePlayer(genshin, "812345678", "os_mars")).toMatchObject({ error: "invalid_zone" });
    expect(validatePlayer(genshin, "812345678")).toMatchObject({ error: "invalid_zone" });
  });

  it("anchors patterns even if the admin forgot ^ and $", () => {
    const game = { ...freeFire, idPattern: "\\d{6}" };
    expect(validatePlayer(game, "123456").ok).toBe(true);
    expect(validatePlayer(game, "abc123456xyz").ok).toBe(false);
  });

  it("falls back to a sane default for a missing or broken pattern", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = { ...freeFire, idPattern: "^[0-9" };
    expect(validatePlayer(broken, "PlayerOne_7").ok).toBe(true);
    expect(validatePlayer(broken, "<script>").ok).toBe(false);
    expect(validatePlayer({ ...freeFire, idPattern: null }, "abc.123").ok).toBe(true);
    warn.mockRestore();
  });

  it("refuses catastrophic patterns instead of hanging", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(compileSafePattern("^(a+)+$")).toBeNull();
    expect(compileSafePattern("^(a|aa)+$")).toBeNull();
    expect(compileSafePattern("^(\\d*)*$")).toBeNull();
    expect(compileSafePattern("^\\d{5,12}$")).toBeInstanceOf(RegExp);
    const evil = { ...freeFire, idPattern: "^(a+)+$" };
    const started = performance.now();
    expect(validatePlayer(evil, `${"a".repeat(60)}!`).ok).toBe(false);
    expect(performance.now() - started).toBeLessThan(200);
    warn.mockRestore();
  });
});
