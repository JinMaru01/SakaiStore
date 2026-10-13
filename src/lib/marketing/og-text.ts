/**
 * Text helpers for generated images (Open Graph + promo images). Pure.
 *
 * Satori cannot shape Khmer, and for any glyph missing from our bundled
 * Latin font it fetches fallback fonts from Google at render time. So image
 * text is restricted to characters the font really has (Latin-1 + common
 * punctuation); admin-entered emoji or Khmer are dropped, never rendered as
 * tofu boxes.
 */

const UNSUPPORTED = /[^ -~ -ÿ–—‘-”•…€™]/g;

/** `value` reduced to renderable characters, whitespace collapsed; `fallback` when nothing is left. */
export function latinText(value: string | null | undefined, fallback = ""): string {
  const s = (value ?? "")
    .normalize("NFC")
    .replace(UNSUPPORTED, "")
    .replace(/\s+/g, " ")
    .trim();
  return s || fallback;
}

/** Cut to `max` characters with an ellipsis. */
export function truncate(value: string, max: number): string {
  const chars = [...value];
  return chars.length <= max ? value : `${chars.slice(0, Math.max(1, max - 1)).join("").trimEnd()}…`;
}

/** "https://www.sakaistore.com/" → "sakaistore.com" (what people type). */
export function displayHost(siteUrl: string): string {
  try {
    return new URL(siteUrl).host.replace(/^www\./, "");
  } catch {
    return siteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}
