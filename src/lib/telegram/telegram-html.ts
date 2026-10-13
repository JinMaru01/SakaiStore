/**
 * Validator for Telegram's HTML parse mode, used by tests to make sure every
 * message we build is accepted: Telegram rejects the WHOLE message ("can't
 * parse entities") on an unknown tag, an unbalanced tag or a stray "<", "&".
 * Pure; returns the first problem found, or null when the text is valid.
 */

const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ins",
  "s",
  "strike",
  "del",
  "a",
  "code",
  "pre",
  "blockquote",
  "tg-spoiler",
  "tg-emoji",
  "span",
]);

const TAG_RE = /<(\/?)([a-z][a-z-]*)((?:\s+[a-z-]+="[^"<>]*")*)\s*>/gi;
const ENTITY_RE = /&(?:lt|gt|amp|quot|#\d+|#x[0-9a-f]+);/gi;

export function checkTelegramHtml(text: string): string | null {
  const stack: string[] = [];
  for (const m of text.matchAll(TAG_RE)) {
    const [, closing, rawName, attrs] = m;
    const name = rawName!.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return `unsupported tag <${name}>`;
    if (closing) {
      if (stack.pop() !== name) return `unbalanced </${name}>`;
    } else {
      if (name === "a" && !/\shref="[^"]+"/.test(attrs ?? "")) return "<a> without href";
      stack.push(name);
    }
  }
  if (stack.length) return `unclosed <${stack.at(-1)}>`;
  const bare = text.replace(TAG_RE, "").replace(ENTITY_RE, "");
  if (/[<>]/.test(bare)) return 'unescaped "<" or ">"';
  if (bare.includes("&")) return 'unescaped "&"';
  if (text.length > 4096) return `too long (${text.length} > 4096)`;
  return null;
}
