import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track, trackPageView } from "./client";
import { PIXEL_QUEUE_LIMIT } from "./pixels";

/* No DOM in this test environment: a plain object stands in for `window`. */

type FakeWindow = Record<string, unknown>;

function stubWindow(w: FakeWindow = {}): FakeWindow {
  vi.stubGlobal("window", w);
  return w;
}

beforeEach(() => {
  // track() logs every event outside production.
  vi.spyOn(console, "debug").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const PURCHASE = { contentId: "free-fire", contentName: "Free Fire - 310 Diamonds", value: 3, currency: "USD" as const, orderCode: "SKABC12345" };

describe("track()", () => {
  it("is a no-op on the server", () => {
    expect(() => track("Purchase", PURCHASE)).not.toThrow();
  });

  it("calls fbq and ttq.track when the pixels are loaded", () => {
    const fbq = vi.fn();
    const ttq = { track: vi.fn(), page: vi.fn() };
    stubWindow({ fbq, ttq });
    track("Purchase", PURCHASE);
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.objectContaining({ content_ids: ["free-fire"], value: 3, currency: "USD" }),
      { eventID: "SKABC12345" },
    );
    expect(ttq.track).toHaveBeenCalledWith("CompletePayment", expect.objectContaining({ value: 3 }), { event_id: "SKABC12345" });
  });

  it("queues events fired before the pixel scripts ran, with a bounded queue", () => {
    const w = stubWindow();
    track("ViewContent", { contentId: "free-fire" });
    const queue = w.__skPixelQueue as { meta: unknown[][]; tiktok: unknown[][] };
    expect(queue.meta).toEqual([["track", "ViewContent", { content_ids: ["free-fire"], content_type: "product" }]]);
    expect(queue.tiktok[0]!.slice(0, 2)).toEqual(["track", "ViewContent"]);

    for (let i = 0; i < PIXEL_QUEUE_LIMIT + 10; i++) track("AddToCart", { contentId: `x:${i}` });
    expect(queue.meta).toHaveLength(PIXEL_QUEUE_LIMIT);
    expect(queue.meta.at(-1)![2]).toMatchObject({ content_ids: [`x:${PIXEL_QUEUE_LIMIT + 9}`] });
  });

  it("never throws even when a pixel throws", () => {
    stubWindow({
      fbq: () => {
        throw new Error("blocked by an ad blocker");
      },
    });
    expect(() => track("Contact")).not.toThrow();
  });
});

describe("trackPageView()", () => {
  it("fires PageView on both pixels", () => {
    const fbq = vi.fn();
    const ttq = { page: vi.fn() };
    stubWindow({ fbq, ttq });
    trackPageView();
    expect(fbq).toHaveBeenCalledWith("track", "PageView");
    expect(ttq.page).toHaveBeenCalledOnce();
  });
});
