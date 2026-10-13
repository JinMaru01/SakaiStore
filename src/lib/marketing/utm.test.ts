import { describe, expect, it } from "vitest";
import { classifyChannel } from "@/lib/attribution";
import {
  ALL_GAMES_CAMPAIGN,
  buildUtmLink,
  presetLandingUrl,
  presetParams,
  UTM_PRESETS,
  utmValue,
  withPromoParam,
} from "./utm";

describe("utmValue", () => {
  it("lowercases and keeps only safe characters", () => {
    expect(utmValue("  TikTok Bio ")).toBe("tiktok_bio");
    expect(utmValue("Flash  Sale!!")).toBe("flash_sale");
    expect(utmValue("<script>")).toBe("script");
    expect(utmValue(null)).toBe("");
    expect(utmValue("x".repeat(300))).toHaveLength(100);
  });
});

describe("presets", () => {
  it.each(UTM_PRESETS.map((p) => [p.id, p] as const))("%s attributes to the right channel", (_id, preset) => {
    const url = buildUtmLink(presetLandingUrl("https://sakaistore.com", preset, "free-fire"), presetParams(preset, "free-fire"));
    const source = new URL(url).searchParams.get("utm_source")!;
    const expected = preset.source === "messenger" ? "facebook" : preset.source;
    expect(classifyChannel({ utmSource: source })).toBe(expected);
  });

  it("uses the game slug as campaign, or all-games", () => {
    const post = UTM_PRESETS.find((p) => p.id === "facebook_post")!;
    expect(presetParams(post, "free-fire")).toMatchObject({ campaign: "free-fire", content: "page_post" });
    expect(presetParams(post, null).campaign).toBe(ALL_GAMES_CAMPAIGN);
  });

  it("points bio and auto-reply links at the home page", () => {
    const bio = UTM_PRESETS.find((p) => p.id === "tiktok_bio")!;
    expect(presetLandingUrl("https://sakaistore.com/", bio, "free-fire")).toBe("https://sakaistore.com/");
    const comment = UTM_PRESETS.find((p) => p.id === "tiktok_comment")!;
    expect(presetLandingUrl("https://sakaistore.com/", comment, "free-fire")).toBe("https://sakaistore.com/games/free-fire");
    expect(buildUtmLink(presetLandingUrl("https://sakaistore.com", bio, null), presetParams(bio, null))).toBe(
      "https://sakaistore.com/?utm_source=tiktok&utm_medium=social&utm_campaign=bio",
    );
  });
});

describe("withPromoParam", () => {
  it("adds an uppercase promo param and ignores invalid codes", () => {
    expect(withPromoParam("https://x.com/games/a?utm_source=fb", "fb5")).toBe("https://x.com/games/a?utm_source=fb&promo=FB5");
    expect(withPromoParam("https://x.com/", "bad code!")).toBe("https://x.com/");
    expect(withPromoParam("https://x.com/", null)).toBe("https://x.com/");
  });
});
