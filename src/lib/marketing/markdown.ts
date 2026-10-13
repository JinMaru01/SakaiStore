/**
 * Minimal Markdown parser for rendering docs/SOCIAL_MEDIA_PLAYBOOK.md inside
 * the admin (no dependency, no HTML passthrough: the renderer builds React
 * elements, so nothing in the file can inject markup or script).
 *
 * Supported: # headings (with GitHub-style ids), paragraphs, - / 1. lists
 * (one nested level, "- [ ]" task items), > quotes, ``` code blocks,
 * | tables |, --- rules; inline `code`, **bold**, *italic*, [links](url).
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

export type ListItem = { content: Inline[]; checked: boolean | null; children: ListBlock | null };
export type ListBlock = { type: "list"; ordered: boolean; start: number; items: ListItem[] };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; id: string; content: Inline[]; text: string }
  | { type: "paragraph"; content: Inline[] }
  | ListBlock
  | { type: "code"; lang: string; text: string }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] }
  | { type: "quote"; content: Inline[][] }
  | { type: "hr" };

/** GitHub-style heading anchor: "2. Set up the Facebook Page" → "2-set-up-the-facebook-page". */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[`*_[\]()]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}

/** Only these link targets are rendered as links; anything else stays plain text. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^#[\w\-\p{L}\p{M}]*$/u.test(h)) return h;
  if (/^\/(?!\/)/.test(h)) return h;
  try {
    const u = new URL(h);
    return u.protocol === "https:" || u.protocol === "http:" || u.protocol === "mailto:" ? u.toString() : null;
  } catch {
    return null;
  }
}

// ───────────────────────────── inline ─────────────────────────────

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ type: "text", text });
    text = "";
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^`([^`]+)`/))) {
      flush();
      out.push({ type: "code", text: m[1]! });
      i += m[0].length;
    } else if ((m = rest.match(/^\*\*(.+?)\*\*/))) {
      flush();
      out.push({ type: "strong", children: parseInline(m[1]!) });
      i += m[0].length;
    } else if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) {
      flush();
      const href = safeHref(m[2]!);
      const children = parseInline(m[1]!);
      if (href) out.push({ type: "link", href, children });
      else out.push(...children);
      i += m[0].length;
    } else if ((m = rest.match(/^\*([^*\s][^*]*?)\*/)) || (m = rest.match(/^_([^_\s][^_]*?)_(?![\w])/))) {
      // `_` only counts at a word boundary, so snake_case and utm_source stay text.
      const prev = src[i - 1];
      if (m[0][0] === "_" && prev && /\w/.test(prev)) {
        text += src[i];
        i += 1;
        continue;
      }
      flush();
      out.push({ type: "em", children: parseInline(m[1]!) });
      i += m[0].length;
    } else {
      text += src[i];
      i += 1;
    }
  }
  flush();
  return out;
}

/** Plain text of inline nodes (heading ids, alt text). */
export function inlineText(nodes: Inline[]): string {
  return nodes.map((n) => (n.type === "text" || n.type === "code" ? n.text : inlineText(n.children))).join("");
}

// ───────────────────────────── blocks ─────────────────────────────

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  // Allow escaped pipes inside cells.
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

function parseList(lines: string[], start: number): { block: ListBlock; next: number } {
  const first = lines[start]!.match(LIST_RE)!;
  const baseIndent = first[1]!.length;
  const ordered = /\d/.test(first[2]!);
  const block: ListBlock = { type: "list", ordered, start: ordered ? parseInt(first[2]!, 10) : 1, items: [] };
  let i = start;
  while (i < lines.length) {
    const line = lines[i]!;
    const m = line.match(LIST_RE);
    if (m && m[1]!.length === baseIndent && /\d/.test(m[2]!) === ordered) {
      let body = m[3]!;
      let checked: boolean | null = null;
      const task = body.match(/^\[( |x|X)\]\s+(.*)$/);
      if (task) {
        checked = task[1] !== " ";
        body = task[2]!;
      }
      block.items.push({ content: parseInline(body), checked, children: null });
      i++;
      continue;
    }
    if (m && m[1]!.length > baseIndent && block.items.length > 0) {
      const nested = parseList(lines, i);
      block.items[block.items.length - 1]!.children = nested.block;
      i = nested.next;
      continue;
    }
    // Lazy continuation line of the previous item.
    if (line.trim() && /^\s{2,}\S/.test(line) && block.items.length > 0 && !m) {
      const item = block.items[block.items.length - 1]!;
      item.content = [...item.content, { type: "text", text: " " }, ...parseInline(line.trim())];
      i++;
      continue;
    }
    break;
  }
  return { block, next: i };
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const ids = new Map<string, number>();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^```\s*([\w-]*)\s*$/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) body.push(lines[i++]!);
      i++; // closing fence
      blocks.push({ type: "code", lang: fence[1] ?? "", text: body.join("\n") });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const content = parseInline(heading[2]!);
      const text = inlineText(content);
      const base = slugifyHeading(text);
      const seen = ids.get(base) ?? 0;
      ids.set(base, seen + 1);
      blocks.push({
        type: "heading",
        level: heading[1]!.length as 1 | 2 | 3 | 4,
        id: seen ? `${base}-${seen}` : base,
        content,
        text,
      });
      i++;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    if (line.trim().startsWith("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]!)) {
      const header = splitRow(line).map(parseInline);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i]!.trim().startsWith("|")) rows.push(splitRow(lines[i++]!).map(parseInline));
      blocks.push({ type: "table", header, rows });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const content: Inline[][] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) {
        const text = lines[i]!.replace(/^\s*>\s?/, "");
        if (text.trim()) content.push(parseInline(text));
        i++;
      }
      blocks.push({ type: "quote", content });
      continue;
    }
    if (LIST_RE.test(line)) {
      const { block, next } = parseList(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^(#{1,4})\s/.test(lines[i]!) &&
      !/^```/.test(lines[i]!) &&
      !LIST_RE.test(lines[i]!) &&
      !/^\s*>/.test(lines[i]!) &&
      !lines[i]!.trim().startsWith("|")
    ) {
      para.push(lines[i]!.trim());
      i++;
    }
    if (para.length === 0) {
      // A line no rule consumed (e.g. a stray "|"): keep it as text so the loop always advances.
      para.push(line.trim());
      i++;
    }
    blocks.push({ type: "paragraph", content: parseInline(para.join(" ")) });
  }
  return blocks;
}

/** h2 headings, for the table of contents. */
export function tableOfContents(blocks: Block[]): { id: string; text: string }[] {
  return blocks.filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading" && b.level === 2).map((b) => ({ id: b.id, text: b.text }));
}
