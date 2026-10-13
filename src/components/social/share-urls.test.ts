import { describe, expect, it } from "vitest";
import { classifyChannel } from "@/lib/attribution";
import {
  facebookShareUrl,
  isInAppBrowser,
  isMobileUserAgent,
  messengerShareUrl,
  telegramShareUrl,
  withShareUtm,
} from "./share-urls";

const PAGE = "https://sakai.example/games/mobile-legends";

describe("withShareUtm", () => {
  it("tags the url with utm_source=<network>&utm_medium=share", () => {
    const u = new URL(withShareUtm(PAGE, "facebook"));
    expect(u.origin + u.pathname).toBe(PAGE);
    expect(u.searchParams.get("utm_source")).toBe("facebook");
    expect(u.searchParams.get("utm_medium")).toBe("share");
  });

  it("replaces existing tracking params and click ids", () => {
    const u = new URL(withShareUtm(`${PAGE}?utm_source=tiktok&fbclid=abc&ttclid=x&promo=FB5`, "telegram", "spring"));
    expect(u.searchParams.get("utm_source")).toBe("telegram");
    expect(u.searchParams.get("utm_campaign")).toBe("spring");
    expect(u.searchParams.has("fbclid")).toBe(false);
    expect(u.searchParams.has("ttclid")).toBe(false);
    // non-tracking params survive (e.g. a promo code in the link)
    expect(u.searchParams.get("promo")).toBe("FB5");
  });

  it("returns invalid urls unchanged", () => {
    expect(withShareUtm("not a url", "copy")).toBe("not a url");
  });

  it("produces links that attribution classifies to the right channel", () => {
    const channelOf = (url: string) => {
      const u = new URL(url);
      return classifyChannel({ utmSource: u.searchParams.get("utm_source") ?? undefined });
    };
    expect(channelOf(withShareUtm(PAGE, "facebook"))).toBe("facebook");
    expect(channelOf(withShareUtm(PAGE, "messenger"))).toBe("facebook");
    expect(channelOf(withShareUtm(PAGE, "telegram"))).toBe("telegram");
  });
});

describe("network share urls", () => {
  it("builds the Facebook sharer url with an encoded, tagged link", () => {
    const url = new URL(facebookShareUrl(PAGE));
    expect(url.origin + url.pathname).toBe("https://www.facebook.com/sharer/sharer.php");
    const shared = new URL(url.searchParams.get("u")!);
    expect(shared.searchParams.get("utm_source")).toBe("facebook");
  });

  it("builds the Telegram share url with text", () => {
    const url = new URL(telegramShareUrl(PAGE, "Top up & save!"));
    expect(url.origin + url.pathname).toBe("https://t.me/share/url");
    expect(url.searchParams.get("text")).toBe("Top up & save!");
    expect(new URL(url.searchParams.get("url")!).searchParams.get("utm_source")).toBe("telegram");
    expect(telegramShareUrl(PAGE)).not.toContain("text=");
  });

  it("builds the Messenger app link", () => {
    const url = messengerShareUrl(PAGE);
    expect(url.startsWith("fb-messenger://share/?link=")).toBe(true);
    expect(decodeURIComponent(url.split("link=")[1]!)).toContain("utm_source=messenger");
  });
});

describe("user agent helpers", () => {
  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
  const FB_IAB = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0]";
  const TIKTOK = "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/119 Mobile Safari/537.36 BytedanceWebview/d8a21c6 musical_ly_2023";
  const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

  it("detects mobile devices", () => {
    expect(isMobileUserAgent(IPHONE)).toBe(true);
    expect(isMobileUserAgent(FB_IAB)).toBe(true);
    expect(isMobileUserAgent(DESKTOP)).toBe(false);
    expect(isMobileUserAgent(null)).toBe(false);
  });

  it("detects Facebook and TikTok in-app browsers", () => {
    expect(isInAppBrowser(FB_IAB)).toBe(true);
    expect(isInAppBrowser(TIKTOK)).toBe(true);
    expect(isInAppBrowser(IPHONE)).toBe(false);
    expect(isInAppBrowser(DESKTOP)).toBe(false);
  });
});
