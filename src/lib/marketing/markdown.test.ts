import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAYBOOK_ANCHORS } from "./checklist";
import { inlineText, parseInline, parseMarkdown, safeHref, slugifyHeading, tableOfContents, type Block } from "./markdown";

describe("slugifyHeading (GitHub-style anchors)", () => {
  it.each([
    ["2. Set up the Facebook Page", "2-set-up-the-facebook-page"],
    ["Messenger instant reply and saved replies", "messenger-instant-reply-and-saved-replies"],
    ["Caption bank (English / Khmer)", "caption-bank-english--khmer"],
    ["`code` **bold**", "code-bold"],
  ])("%s → %s", (text, id) => {
    expect(slugifyHeading(text)).toBe(id);
  });
});

describe("parseInline", () => {
  it("parses code, bold, italic and links", () => {
    const nodes = parseInline("Use `FB5` on **Facebook** and *TikTok* — see [docs](https://example.com) or [here](#top).");
    expect(nodes.map((n) => n.type)).toEqual(["text", "code", "text", "strong", "text", "em", "text", "link", "text", "link", "text"]);
    expect(inlineText(nodes)).toBe("Use FB5 on Facebook and TikTok — see docs or here.");
  });

  it("keeps snake_case and utm_source as text", () => {
    expect(parseInline("utm_source=tiktok&utm_campaign=bio")).toEqual([{ type: "text", text: "utm_source=tiktok&utm_campaign=bio" }]);
  });

  it("drops unsafe link targets but keeps their text", () => {
    expect(parseInline("[click](javascript:alert)")).toEqual([{ type: "text", text: "click" }]);
    expect(parseInline("[x](vbscript:msgbox)").some((n) => n.type === "link")).toBe(false);
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("/admin/promos")).toBe("/admin/promos");
    expect(safeHref("#6-channel-promo-codes")).toBe("#6-channel-promo-codes");
  });
});

describe("parseMarkdown", () => {
  const md = [
    "# Title",
    "",
    "Intro **text**",
    "continues here.",
    "",
    "## Section",
    "",
    "1. First",
    "   - nested a",
    "   - nested b",
    "2. Second",
    "",
    "- [ ] todo",
    "- [x] done",
    "",
    "| A | B |",
    "|---|---|",
    "| 1 | `x \\| y` |",
    "",
    "> quote",
    "> more",
    "",
    "```ts",
    "const a = '<script>';",
    "```",
    "",
    "---",
    "## Section",
  ].join("\n");
  const blocks = parseMarkdown(md);
  const types = blocks.map((b) => b.type);

  it("parses every block type", () => {
    expect(types).toEqual(["heading", "paragraph", "heading", "list", "list", "table", "quote", "code", "hr", "heading"]);
  });

  it("joins paragraph lines, nests lists and reads task items", () => {
    const p = blocks[1] as Extract<Block, { type: "paragraph" }>;
    expect(inlineText(p.content)).toBe("Intro text continues here.");
    const ordered = blocks[3] as Extract<Block, { type: "list" }>;
    expect(ordered.ordered).toBe(true);
    expect(ordered.items).toHaveLength(2);
    expect(ordered.items[0]!.children?.items.map((i) => inlineText(i.content))).toEqual(["nested a", "nested b"]);
    const tasks = blocks[4] as Extract<Block, { type: "list" }>;
    expect(tasks.items.map((i) => i.checked)).toEqual([false, true]);
  });

  it("handles tables with escaped pipes and keeps code verbatim", () => {
    const table = blocks[5] as Extract<Block, { type: "table" }>;
    expect(table.rows[0]!.map(inlineText)).toEqual(["1", "x | y"]);
    expect((blocks[7] as Extract<Block, { type: "code" }>).text).toBe("const a = '<script>';");
  });

  it("de-duplicates heading ids and builds a table of contents", () => {
    expect(tableOfContents(blocks)).toEqual([
      { id: "section", text: "Section" },
      { id: "section-1", text: "Section" },
    ]);
  });
});

describe("docs/SOCIAL_MEDIA_PLAYBOOK.md", () => {
  const source = readFileSync(join(process.cwd(), "docs", "SOCIAL_MEDIA_PLAYBOOK.md"), "utf8");
  const blocks = parseMarkdown(source);
  const ids = new Set(blocks.flatMap((b) => (b.type === "heading" ? [b.id] : [])));

  it("has every section the setup checklist links to", () => {
    for (const anchor of Object.values(PLAYBOOK_ANCHORS)) expect(ids, anchor).toContain(anchor);
  });

  it("covers the required topics", () => {
    const toc = tableOfContents(blocks).map((t) => t.text.toLowerCase());
    for (const topic of ["facebook page", "tiktok", "meta pixel", "tiktok pixel", "promo codes", "marketing studio", "content pillars", "calendar", "caption bank", "hashtag", "video ideas", "ads", "community", "compliance"]) {
      expect(toc.some((t) => t.includes(topic)), topic).toBe(true);
    }
    expect(source).toContain("last non-direct touch wins");
    expect(source).toContain("never message you first");
  });

  it("only contains safe links", () => {
    const links: string[] = [];
    const walk = (nodes: ReturnType<typeof parseInline>) =>
      nodes.forEach((n) => {
        if (n.type === "link") links.push(n.href);
        if (n.type === "strong" || n.type === "em" || n.type === "link") walk(n.children);
      });
    for (const b of blocks) {
      if (b.type === "paragraph" || b.type === "heading") walk(b.content);
    }
    for (const href of links) expect(safeHref(href)).toBe(href);
  });
});
