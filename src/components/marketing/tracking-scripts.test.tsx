import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

import { PixelScripts } from "./pixel-scripts";
import { TrackingScripts } from "./tracking-scripts";

afterEach(() => {
  vi.unstubAllEnvs();
  nav.pathname = "/";
});

const render = (el: React.ReactElement | null) => (el ? renderToString(el) : "");

describe("TrackingScripts", () => {
  it("renders nothing without pixel ids", () => {
    vi.stubEnv("NEXT_PUBLIC_FB_PIXEL_ID", "");
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "");
    expect(TrackingScripts()).toBeNull();
  });

  it("ignores ids that could inject script", () => {
    vi.stubEnv("NEXT_PUBLIC_FB_PIXEL_ID", "1');alert(document.cookie);//");
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "</script><script>alert(1)</script>");
    expect(TrackingScripts()).toBeNull();
  });

  it("passes only validated ids to the client", () => {
    vi.stubEnv("NEXT_PUBLIC_FB_PIXEL_ID", " 123456789012345 ");
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "bad id");
    const el = TrackingScripts();
    expect(el?.props).toEqual({ metaPixelId: "123456789012345", tiktokPixelId: null });
  });
});

describe("PixelScripts", () => {
  it("renders the Meta noscript beacon on store pages", () => {
    const html = render(<PixelScripts metaPixelId="123456789012345" tiktokPixelId="C4ABCDEFGH1234567890" />);
    expect(html).toContain("https://www.facebook.com/tr?id=123456789012345&amp;ev=PageView&amp;noscript=1");
  });

  it("never loads on the admin", () => {
    nav.pathname = "/admin/orders";
    expect(render(<PixelScripts metaPixelId="123456789012345" tiktokPixelId={null} />)).toBe("");
  });

  it("re-validates ids it receives", () => {
    expect(render(<PixelScripts metaPixelId={"1');alert(1)//"} tiktokPixelId={"x y"} />)).toBe("");
  });
});
