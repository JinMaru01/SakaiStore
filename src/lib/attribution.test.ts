import { describe, expect, it } from "vitest";
import { attributionFromUrl, classifyChannel, decodeAttribution, encodeAttribution } from "./attribution";

describe("attribution", () => {
  it("classifies utm sources", () => {
    expect(classifyChannel({ utmSource: "facebook" })).toBe("facebook");
    expect(classifyChannel({ utmSource: "fb" })).toBe("facebook");
    expect(classifyChannel({ utmSource: "tiktok" })).toBe("tiktok");
    expect(classifyChannel({ utmSource: "twitter" })).toBe("other");
    expect(classifyChannel({ utmSource: "tg" })).toBe("telegram");
  });
  it("classifies referrers and click ids", () => {
    expect(classifyChannel({ referrer: "https://m.facebook.com/" })).toBe("facebook");
    expect(classifyChannel({ referrer: "https://www.tiktok.com/@x" })).toBe("tiktok");
    expect(classifyChannel({ clickId: "abc", landingPath: "/?fbclid=abc" })).toBe("facebook");
    expect(classifyChannel(null)).toBe("direct");
  });
  it("round-trips the cookie and survives garbage", () => {
    const a = attributionFromUrl(new URL("https://x.com/games/mlbb?utm_source=tiktok&ttclid=1"), null);
    expect(decodeAttribution(encodeAttribution(a))?.utmSource).toBe("tiktok");
    expect(decodeAttribution("%%%")).toBeNull();
    expect(decodeAttribution("null")).toBeNull();
  });
});
