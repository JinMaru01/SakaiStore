import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  isTrackablePath,
  metaEventArgs,
  metaPixelBaseCode,
  metaPixelNoscriptUrl,
  readPixelConfig,
  tiktokEventArgs,
  tiktokPixelBaseCode,
  validMetaPixelId,
  validTikTokPixelId,
} from "./pixels";

describe("pixel id validation", () => {
  it("accepts real-looking ids", () => {
    expect(validMetaPixelId(" 123456789012345 ")).toBe("123456789012345");
    expect(validTikTokPixelId("C4ABCDEFGH1234567890")).toBe("C4ABCDEFGH1234567890");
  });

  it.each([
    "",
    "abc",
    "1234",
    "123456789012345'); alert(1); //",
    "123456789012345</script><script>alert(1)</script>",
    "12345678901234567890123",
  ])("rejects Meta id %j", (v) => {
    expect(validMetaPixelId(v)).toBeNull();
  });

  it.each(["", "c4abcdefgh12345", "C4ABC'DEF", "C4ABC DEF12", "C4ABCDEF\n12", "<script>"])("rejects TikTok id %j", (v) => {
    expect(validTikTokPixelId(v)).toBeNull();
  });

  it("reads config from env and ignores invalid ids", () => {
    expect(readPixelConfig({ NEXT_PUBLIC_FB_PIXEL_ID: "1234567890", NEXT_PUBLIC_TIKTOK_PIXEL_ID: "x';alert(1)" })).toEqual({
      metaPixelId: "1234567890",
      tiktokPixelId: null,
    });
    expect(readPixelConfig({})).toEqual({ metaPixelId: null, tiktokPixelId: null });
  });

  it("refuses to build base code for an invalid id", () => {
    expect(() => metaPixelBaseCode("1');alert(1)//")).toThrow();
    expect(() => tiktokPixelBaseCode("bad id")).toThrow();
    expect(metaPixelNoscriptUrl("nope")).toBeNull();
    expect(metaPixelNoscriptUrl("1234567890")).toBe("https://www.facebook.com/tr?id=1234567890&ev=PageView&noscript=1");
  });
});

describe("event mapping", () => {
  const purchase = { contentId: "mobile-legends", contentName: "MLBB - 86 Diamonds", value: 1.499999, currency: "USD" as const, orderCode: "SK7F3K9Q2M" };

  it("maps Meta events with content ids, value and eventID for dedupe", () => {
    expect(metaEventArgs("Purchase", purchase)).toEqual([
      "track",
      "Purchase",
      { content_ids: ["mobile-legends"], content_type: "product", content_name: "MLBB - 86 Diamonds", value: 1.5, currency: "USD" },
      { eventID: "SK7F3K9Q2M" },
    ]);
    expect(metaEventArgs("Contact")).toEqual(["track", "Contact", {}]);
  });

  it("maps TikTok events (Purchase → CompletePayment) with contents and event_id", () => {
    expect(tiktokEventArgs("Purchase", purchase)).toEqual([
      "track",
      "CompletePayment",
      {
        contents: [{ content_id: "mobile-legends", content_name: "MLBB - 86 Diamonds", content_type: "product", quantity: 1 }],
        value: 1.5,
        currency: "USD",
      },
      { event_id: "SK7F3K9Q2M" },
    ]);
    expect(tiktokEventArgs("AddToCart", { contentId: "ff:3", value: 1 })[1]).toBe("AddToCart");
    expect(tiktokEventArgs("Lead")[1]).toBe("SubmitForm");
  });

  it("drops invalid values instead of sending NaN", () => {
    expect(metaEventArgs("ViewContent", { contentId: "x", value: Number.NaN })[2]).toEqual({ content_ids: ["x"], content_type: "product" });
    expect(tiktokEventArgs("ViewContent", { value: -1 })[2]).toEqual({});
  });
});

describe("base code", () => {
  /** Runs the snippet in a fake browser and returns what the pixel stub received. */
  function run(code: string, preQueued: Record<string, unknown[][]>) {
    const inserted: string[] = [];
    const scriptEl = { parentNode: { insertBefore: (el: { src: string }) => inserted.push(el.src) } };
    const window: Record<string, unknown> = { __skPixelQueue: preQueued };
    const document = {
      createElement: () => ({}) as { src: string },
      getElementsByTagName: () => [scriptEl],
    };
    window.window = window;
    window.document = document;
    runInNewContext(code, window);
    return { window, inserted };
  }

  it("Meta: disables autoConfig, inits, tracks PageView, then replays queued events", () => {
    const queued = [["track", "ViewContent", { content_ids: ["ff"] }]];
    const { window, inserted } = run(metaPixelBaseCode("1234567890"), { meta: queued });
    const fbq = window.fbq as { queue: unknown[][] };
    expect(inserted).toEqual(["https://connect.facebook.net/en_US/fbevents.js"]);
    expect(fbq.queue.map((args) => Array.from(args))).toEqual([
      ["set", "autoConfig", false, "1234567890"],
      ["init", "1234567890"],
      ["track", "PageView"],
      ["track", "ViewContent", { content_ids: ["ff"] }],
    ]);
    expect((window.__skPixelQueue as { meta: unknown[] }).meta).toEqual([]);
  });

  it("TikTok: loads, tracks the page, then replays queued events", () => {
    const queued = [["track", "CompletePayment", { value: 1 }, { event_id: "SK1" }]];
    const { window, inserted } = run(tiktokPixelBaseCode("C4ABCDEFGH1234567890"), { tiktok: queued });
    expect(inserted[0]).toContain("https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=C4ABCDEFGH1234567890");
    const ttq = window.ttq as unknown[][];
    expect(ttq.map((a) => Array.from(a))).toEqual([["page"], ["track", "CompletePayment", { value: 1 }, { event_id: "SK1" }]]);
  });
});

describe("isTrackablePath", () => {
  it("never tracks the admin", () => {
    expect(isTrackablePath("/")).toBe(true);
    expect(isTrackablePath("/games/free-fire")).toBe(true);
    expect(isTrackablePath("/administrator")).toBe(true);
    expect(isTrackablePath("/admin")).toBe(false);
    expect(isTrackablePath("/admin/orders")).toBe(false);
  });
});
