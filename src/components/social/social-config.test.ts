import { describe, expect, it } from "vitest";
import {
  safeExternalUrl,
  socialLinks,
  supportChatLinks,
  supportContactLine,
  telegramHandle,
  telegramUserUrl,
  telHref,
} from "./social-config";

const SOCIAL = {
  facebookUrl: "https://www.facebook.com/sakaistore",
  tiktokUrl: "https://www.tiktok.com/@sakaistore",
  telegramUrl: "",
  messengerUrl: "https://m.me/sakaistore",
  youtubeUrl: "javascript:alert(1)",
  instagramUrl: "",
};

describe("socialLinks", () => {
  it("returns only configured, safe links in the requested order", () => {
    expect(socialLinks(SOCIAL)).toEqual([
      { network: "facebook", url: "https://www.facebook.com/sakaistore" },
      { network: "tiktok", url: "https://www.tiktok.com/@sakaistore" },
    ]);
    expect(socialLinks(SOCIAL, ["tiktok", "facebook"]).map((l) => l.network)).toEqual(["tiktok", "facebook"]);
    expect(socialLinks(null)).toEqual([]);
  });

  it("drops non-http(s) urls", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("  ")).toBeNull();
    expect(safeExternalUrl("https://t.me/x")).toBe("https://t.me/x");
  });
});

describe("telegram helpers", () => {
  it.each([
    ["sakaisupport", "https://t.me/sakaisupport"],
    ["@sakaisupport", "https://t.me/sakaisupport"],
    ["t.me/sakaisupport", "https://t.me/sakaisupport"],
    ["https://t.me/sakaisupport/", "https://t.me/sakaisupport"],
    ["https://telegram.me/sakai_support", "https://t.me/sakai_support"],
  ])("normalizes %s", (input, expected) => {
    expect(telegramUserUrl(input)).toBe(expected);
  });

  it("rejects invalid usernames", () => {
    expect(telegramUserUrl("")).toBeNull();
    expect(telegramUserUrl("ab")).toBeNull();
    expect(telegramUserUrl("https://evil.example/sakai")).toBeNull();
    expect(telegramUserUrl("sakai support")).toBeNull();
  });

  it("formats a display handle", () => {
    expect(telegramHandle("t.me/sakaisupport")).toBe("@sakaisupport");
    expect(telegramHandle("")).toBeNull();
  });
});

describe("supportChatLinks", () => {
  it("prefers the support username over the public channel", () => {
    expect(
      supportChatLinks({ supportTelegram: "@helpdesk" }, { messengerUrl: SOCIAL.messengerUrl, telegramUrl: "https://t.me/channel" }),
    ).toEqual({ messenger: "https://m.me/sakaistore", telegram: "https://t.me/helpdesk" });
  });

  it("falls back to the Telegram link from social settings", () => {
    expect(supportChatLinks({ supportTelegram: "" }, { messengerUrl: "", telegramUrl: "https://t.me/sakaistore" })).toEqual({
      messenger: null,
      telegram: "https://t.me/sakaistore",
    });
  });

  it("returns nulls when nothing is configured", () => {
    expect(supportChatLinks(null, null)).toEqual({ messenger: null, telegram: null });
  });
});

describe("contact helpers", () => {
  it("builds tel: links", () => {
    expect(telHref("012 345 678")).toBe("tel:012345678");
    expect(telHref("+855 12 345 678")).toBe("tel:+85512345678");
    expect(telHref("12")).toBeNull();
    expect(telHref("")).toBeNull();
  });

  it("builds the support contact line", () => {
    expect(supportContactLine({ supportTelegram: "helpdesk", supportPhone: "012 345 678" })).toBe(
      "Telegram @helpdesk · 012 345 678",
    );
    expect(supportContactLine({ supportTelegram: "", supportPhone: "" })).toBeNull();
  });
});
