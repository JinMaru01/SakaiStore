/**
 * Helpers for the generated game tile art (used when a game has no imageUrl,
 * because official game logos are trademarks and must not be hotlinked).
 * Pure; safe for server and client.
 */

export const DEFAULT_ACCENT = "#7c5cff";

/**
 * Accept only #rgb / #rrggbb colors. accentColor ends up in a style attribute,
 * so anything else falls back to the default (prevents CSS injection).
 */
export function safeHex(color: string | null | undefined): string {
  const c = color?.trim() ?? "";
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    const [r, g, b] = c.slice(1).toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return DEFAULT_ACCENT;
}

/** Mix a hex color towards black (amount < 0) or white (amount > 0), amount in [-1, 1]. */
export function shade(hex: string, amount: number): string {
  const c = safeHex(hex);
  const target = amount < 0 ? 0 : 255;
  const a = Math.min(1, Math.abs(amount));
  const ch = (i: number) => {
    const v = parseInt(c.slice(i, i + 2), 16);
    return Math.round(v + (target - v) * a)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(1)}${ch(3)}${ch(5)}`;
}

/** #rrggbb + alpha -> rgb(r g b / a) */
export function withAlpha(hex: string, alpha: number): string {
  const c = safeHex(hex);
  const n = (i: number) => parseInt(c.slice(i, i + 2), 16);
  return `rgb(${n(1)} ${n(3)} ${n(5)} / ${alpha})`;
}

const SMALL_WORDS = new Set(["of", "the", "and", "&", "at", "in", "on", "to"]);

/**
 * Short monogram for a game name:
 *   "Mobile Legends: Bang Bang" -> "ML", "PUBG Mobile" -> "PUBG",
 *   "Call of Duty: Mobile" -> "CoD", "Honor of Kings" -> "HoK".
 */
export function gameInitials(name: string): string {
  const main = name.split(/[:\-–|]/)[0]!.trim() || name;
  const words = main.split(/[^\p{L}\p{N}&]+/u).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!;
  if (/^[A-Z0-9]{2,5}$/.test(first)) return first;
  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w[0]!.toLowerCase() : w[0]!.toUpperCase()))
    .join("");
}

/** A same-origin /public path ("/games/ml.png"), not a protocol-relative "//host" URL. */
export function isLocalImageUrl(url: string | null | undefined): url is string {
  return !!url && url.startsWith("/") && !url.startsWith("//");
}

/**
 * Game art we can render: local /public paths (optimized by next/image) and
 * https URLs (rendered unoptimized, loaded straight by the browser, so no
 * remotePatterns are needed). Anything else falls back to the generated tile.
 */
export function isRenderableImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  if (isLocalImageUrl(url)) return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
