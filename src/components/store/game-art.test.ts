import { describe, expect, it } from "vitest";
import { DEFAULT_ACCENT, gameInitials, isRenderableImageUrl, safeHex, shade, withAlpha } from "./game-art";

describe("gameInitials", () => {
  it.each([
    ["Mobile Legends: Bang Bang", "ML"],
    ["Free Fire", "FF"],
    ["PUBG Mobile", "PUBG"],
    ["Honor of Kings", "HoK"],
    ["Call of Duty: Mobile", "CoD"],
    ["Genshin Impact", "GI"],
    ["Magic Chess: Go Go", "MC"],
    ["Blood Strike", "BS"],
    ["Valorant", "VA"],
    ["", "?"],
  ])("%s -> %s", (name, expected) => {
    expect(gameInitials(name)).toBe(expected);
  });
});

describe("colors", () => {
  it("accepts only hex colors (prevents CSS injection via accentColor)", () => {
    expect(safeHex("#3B6CFF")).toBe("#3b6cff");
    expect(safeHex("#abc")).toBe("#aabbcc");
    expect(safeHex("red;background:url(x)")).toBe(DEFAULT_ACCENT);
    expect(safeHex(null)).toBe(DEFAULT_ACCENT);
  });

  it("shades towards black and white", () => {
    expect(shade("#808080", -1)).toBe("#000000");
    expect(shade("#808080", 1)).toBe("#ffffff");
    expect(shade("#808080", 0)).toBe("#808080");
    expect(shade("#ff0000", -0.5)).toBe("#800000");
  });

  it("formats rgb with alpha", () => {
    expect(withAlpha("#ff8000", 0.5)).toBe("rgb(255 128 0 / 0.5)");
  });
});

describe("isRenderableImageUrl", () => {
  it("allows https urls and local paths only", () => {
    expect(isRenderableImageUrl("https://cdn.example.com/mlbb.png")).toBe(true);
    expect(isRenderableImageUrl("/games/mlbb.webp")).toBe(true);
    expect(isRenderableImageUrl("http://cdn.example.com/mlbb.png")).toBe(false);
    expect(isRenderableImageUrl("//cdn.example.com/mlbb.png")).toBe(false);
    expect(isRenderableImageUrl("javascript:alert(1)")).toBe(false);
    expect(isRenderableImageUrl(null)).toBe(false);
    expect(isRenderableImageUrl("")).toBe(false);
  });
});
