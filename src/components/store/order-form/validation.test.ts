import { describe, expect, it } from "vitest";
import {
  compilePattern,
  isNumericPattern,
  normalizePlayerId,
  normalizeZoneId,
  splitIdAndZone,
  usesZone,
  validatePlayerIdField,
  validateZoneField,
  type ZoneRules,
} from "./validation";

const MLBB: ZoneRules = { requiresZone: true, zonePattern: "^\\d{3,6}$", zoneOptions: null };
const GENSHIN: ZoneRules = {
  requiresZone: true,
  zonePattern: null,
  zoneOptions: [
    { value: "os_asia", label: "Asia" },
    { value: "os_usa", label: "America" },
  ],
};
const FREE_FIRE: ZoneRules = { requiresZone: false, zonePattern: null, zoneOptions: null };

describe("isNumericPattern", () => {
  it.each(["^\\d{5,12}$", "^\\d+$", "\\d{6}", "^[0-9]{6,12}$", "^[0-9]*$"])("%s is numeric", (p) => {
    expect(isNumericPattern(p)).toBe(true);
  });
  it.each([null, "", "^[A-Za-z0-9]{4,20}$", "^\\d{5}-\\d{2}$", "^\\w+$"])("%s is not numeric", (p) => {
    expect(isNumericPattern(p)).toBe(false);
  });
});

describe("compilePattern", () => {
  it("anchors the pattern to the whole input", () => {
    const re = compilePattern("\\d{6}")!;
    expect(re.test("123456")).toBe(true);
    expect(re.test("abc123456xyz")).toBe(false);
  });
  it("returns null for invalid or oversized patterns", () => {
    expect(compilePattern("([")).toBeNull();
    expect(compilePattern("a".repeat(200))).toBeNull();
    expect(compilePattern("")).toBeNull();
  });
});

describe("validatePlayerIdField", () => {
  it("requires a value", () => {
    expect(validatePlayerIdField("", "^\\d{5,12}$")).toBe("required");
    expect(validatePlayerIdField("   ", "^\\d{5,12}$")).toBe("required");
  });
  it("checks the game pattern after removing spaces", () => {
    expect(validatePlayerIdField("123456789", "^\\d{5,12}$")).toBeNull();
    expect(validatePlayerIdField(" 1234 5678 ", "^\\d{5,12}$")).toBeNull();
    expect(validatePlayerIdField("12ab", "^\\d{5,12}$")).toBe("invalid");
  });
  it("falls back to the default rule when the pattern is missing or broken", () => {
    expect(validatePlayerIdField("Player_01", null)).toBeNull();
    expect(validatePlayerIdField("Player_01", "([")).toBeNull();
    expect(validatePlayerIdField("x", null)).toBe("invalid");
    expect(validatePlayerIdField("<script>", null)).toBe("invalid");
  });
  it("rejects overly long ids", () => {
    expect(validatePlayerIdField("1".repeat(65), null)).toBe("invalid");
  });
});

describe("zones", () => {
  it("knows which games use a zone", () => {
    expect(usesZone(MLBB)).toBe(true);
    expect(usesZone(GENSHIN)).toBe(true);
    expect(usesZone(FREE_FIRE)).toBe(false);
    expect(usesZone({ requiresZone: false, zonePattern: "^\\d+$", zoneOptions: null })).toBe(true);
  });

  it("validates typed zones", () => {
    expect(validateZoneField("", MLBB)).toBe("required");
    expect(validateZoneField("1234", MLBB)).toBeNull();
    expect(validateZoneField("(1234)", MLBB)).toBeNull();
    expect(validateZoneField("12", MLBB)).toBe("invalid");
  });

  it("validates dropdown zones case-insensitively", () => {
    expect(validateZoneField("os_asia", GENSHIN)).toBeNull();
    expect(validateZoneField("OS_ASIA", GENSHIN)).toBeNull();
    expect(validateZoneField("os_mars", GENSHIN)).toBe("invalid");
  });

  it("ignores the zone for games without one", () => {
    expect(validateZoneField("", FREE_FIRE)).toBeNull();
    expect(validateZoneField("whatever", FREE_FIRE)).toBeNull();
  });

  it("allows an empty optional zone", () => {
    expect(validateZoneField("", { requiresZone: false, zonePattern: "^\\d+$", zoneOptions: null })).toBeNull();
  });
});

describe("normalizers", () => {
  it("strips whitespace and invisible characters", () => {
    expect(normalizePlayerId(" 123​456 789\n")).toBe("123456789");
    expect(normalizeZoneId(" (1234) ")).toBe("1234");
  });
});

describe("splitIdAndZone", () => {
  it.each([
    ["123456789 (1234)", { id: "123456789", zone: "1234" }],
    ["123456789(1234)", { id: "123456789", zone: "1234" }],
    [" 123456789 [ 1234 ] ", { id: "123456789", zone: "1234" }],
  ])("splits %j", (input, expected) => {
    expect(splitIdAndZone(input)).toEqual(expected);
  });
  it.each(["123456789", "123456789 1234", "(1234)", "abc (1234) extra"])("leaves %j alone", (input) => {
    expect(splitIdAndZone(input)).toBeNull();
  });
});
