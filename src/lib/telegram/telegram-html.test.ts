import { describe, expect, it } from "vitest";
import { checkTelegramHtml } from "./telegram-html";

describe("checkTelegramHtml", () => {
  it("accepts Telegram's supported markup and entities", () => {
    expect(checkTelegramHtml('<b>Hi</b> <i>there</i> <code>SK7F3K9Q2M</code> <a href="https://x.example">x</a>')).toBeNull();
    expect(checkTelegramHtml("Tom &amp; Jerry &lt;3 &#128512; &quot;ok&quot;")).toBeNull();
    expect(checkTelegramHtml("ខ្មែរ — ✅ plain text")).toBeNull();
  });

  it("rejects what Telegram would refuse", () => {
    expect(checkTelegramHtml("Tom & Jerry")).toBe('unescaped "&"');
    expect(checkTelegramHtml("1 < 2")).toBe('unescaped "<" or ">"');
    expect(checkTelegramHtml("<b>bold")).toBe("unclosed <b>");
    expect(checkTelegramHtml("<b><i>x</b></i>")).toBe("unbalanced </b>");
    expect(checkTelegramHtml("<div>x</div>")).toBe("unsupported tag <div>");
    expect(checkTelegramHtml("<a>x</a>")).toBe("<a> without href");
    expect(checkTelegramHtml("x".repeat(4097))).toContain("too long");
  });
});
