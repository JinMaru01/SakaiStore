import { describe, expect, it } from "vitest";
import { classifyChannel, decodeAttribution } from "@/lib/attribution";
import {
  attributionCookieFor,
  encodeAttributionForCookie,
  isMarketingTouch,
  MAX_ATTRIBUTION_COOKIE_VALUE,
} from "./attribution-cookie";

const NOW = 1_760_000_000_000;

/** Simulates the browser cookie jar across page loads: a null result keeps the old cookie. */
function visit(jar: { value: string | null }, href: string, referrer = "") {
  const cookie = attributionCookieFor({ href, referrer, now: NOW });
  if (cookie) jar.value = cookie.split(";")[0]!.slice("sk_attr=".length);
  return cookie;
}

const channelOf = (raw: string | null) => classifyChannel(decodeAttribution(raw));

describe("attributionCookieFor", () => {
  it("writes a 30-day, path=/, SameSite=Lax cookie (Secure on https) for a UTM landing", () => {
    const cookie = attributionCookieFor({
      href: "https://sakaistore.com/games/free-fire?utm_source=tiktok&utm_medium=social&utm_campaign=free-fire",
      referrer: "",
      now: NOW,
    })!;
    const [pair, ...attrs] = cookie.split("; ");
    expect(attrs).toEqual(["Path=/", "Max-Age=2592000", "SameSite=Lax", "Secure"]);
    const a = decodeAttribution(pair!.slice("sk_attr=".length))!;
    expect(a).toMatchObject({
      utmSource: "tiktok",
      utmMedium: "social",
      utmCampaign: "free-fire",
      landingPath: "/games/free-fire?utm_source=tiktok&utm_medium=social&utm_campaign=free-fire",
      ts: NOW,
    });
  });

  it("omits Secure on plain http (local dev)", () => {
    expect(attributionCookieFor({ href: "http://localhost:3000/?utm_source=facebook", now: NOW })).not.toContain("Secure");
  });

  it("treats click ids and external referrers as touches", () => {
    expect(attributionCookieFor({ href: "https://sakaistore.com/?fbclid=IwAR123", now: NOW })).toContain("sk_attr=");
    expect(attributionCookieFor({ href: "https://sakaistore.com/", referrer: "https://l.facebook.com/", now: NOW })).toContain(
      "sk_attr=",
    );
  });

  it("ignores direct visits and internal navigations (including www ↔ apex)", () => {
    expect(attributionCookieFor({ href: "https://sakaistore.com/games/free-fire", referrer: "", now: NOW })).toBeNull();
    expect(
      attributionCookieFor({ href: "https://sakaistore.com/track", referrer: "https://sakaistore.com/", now: NOW }),
    ).toBeNull();
    expect(
      attributionCookieFor({ href: "https://www.sakaistore.com/track", referrer: "https://sakaistore.com/games/x", now: NOW }),
    ).toBeNull();
  });

  it("never throws on garbage", () => {
    expect(attributionCookieFor({ href: "not a url" })).toBeNull();
    expect(attributionCookieFor({ href: "javascript:alert(1)//?utm_source=x" })).toBeNull();
    expect(attributionCookieFor({ href: "https://x.com/?utm_source=a", referrer: "%%%" })).not.toBeNull();
  });

  it("last non-direct touch wins: TikTok overwrites Facebook, direct visits never overwrite", () => {
    const jar = { value: null as string | null };
    visit(jar, "https://sakaistore.com/?utm_source=facebook&utm_medium=social", "https://m.facebook.com/");
    expect(channelOf(jar.value)).toBe("facebook");

    // Back later by typing the URL / from the bank app: still Facebook.
    expect(visit(jar, "https://sakaistore.com/", "")).toBeNull();
    expect(channelOf(jar.value)).toBe("facebook");

    // Then from a TikTok bio link: TikTok now gets the credit.
    visit(jar, "https://sakaistore.com/?utm_source=tiktok&utm_medium=social&utm_campaign=bio");
    expect(channelOf(jar.value)).toBe("tiktok");

    // Internal page loads keep it.
    expect(visit(jar, "https://sakaistore.com/games/free-fire", "https://sakaistore.com/")).toBeNull();
    expect(channelOf(jar.value)).toBe("tiktok");
  });
});

describe("isMarketingTouch", () => {
  it("requires a utm_source, click id or external referrer", () => {
    expect(isMarketingTouch({ utmCampaign: "x" }, "sakaistore.com")).toBe(false);
    expect(isMarketingTouch({ utmSource: "telegram" }, "sakaistore.com")).toBe(true);
    expect(isMarketingTouch({ referrer: "https://t.me/sakaistore" }, "sakaistore.com")).toBe(true);
    expect(isMarketingTouch({ referrer: "https://www.sakaistore.com/x" }, "sakaistore.com")).toBe(false);
  });
});

describe("encodeAttributionForCookie", () => {
  it("drops low-value detail to stay under the cookie budget", () => {
    const huge = {
      utmSource: "facebook",
      utmCampaign: "launch",
      clickId: "c".repeat(255),
      referrer: `https://l.facebook.com/l.php?u=${"%22".repeat(160)}`,
      landingPath: `/games/free-fire?utm_source=facebook&x=${"%7B".repeat(160)}`,
      ts: NOW,
    };
    const value = encodeAttributionForCookie(huge, 900)!;
    expect(value.length).toBeLessThanOrEqual(900);
    const decoded = decodeAttribution(value)!;
    expect(decoded.utmSource).toBe("facebook");
    expect(decoded.utmCampaign).toBe("launch");
    expect(decoded.referrer).toBe("https://l.facebook.com/l.php");
    expect(encodeAttributionForCookie({ utmSource: "x" }, 5)).toBeNull();
    expect(MAX_ATTRIBUTION_COOKIE_VALUE).toBeLessThan(4000);
  });
});
