/**
 * Promo image formats served by GET /api/promo-image/[slug]?format=… and
 * offered in the admin Marketing studio. Pure; safe for server and client.
 */

export const PROMO_FORMATS = {
  square: { width: 1080, height: 1080, label: "Square 1:1", use: "Facebook post" },
  portrait: { width: 1080, height: 1350, label: "Portrait 4:5", use: "Facebook / Instagram feed" },
  story: { width: 1080, height: 1920, label: "Story 9:16", use: "TikTok cover, Reels & Stories" },
} as const;

export type PromoFormat = keyof typeof PROMO_FORMATS;

export const PROMO_FORMAT_IDS = Object.keys(PROMO_FORMATS) as PromoFormat[];

export function isPromoFormat(value: unknown): value is PromoFormat {
  return typeof value === "string" && Object.hasOwn(PROMO_FORMATS, value);
}

/** Slug of the all-games price list poster. */
export const ALL_GAMES_SLUG = "all";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isPromoSlug(value: string): boolean {
  return value === ALL_GAMES_SLUG || SLUG_RE.test(value);
}

/** Admin URL of a promo image. `v` busts the browser cache after price edits. */
export function promoImageUrl(
  slug: string,
  format: PromoFormat,
  opts: { code?: string | null; download?: boolean; v?: string | number } = {},
): string {
  const params = new URLSearchParams({ format });
  if (opts.code) params.set("code", opts.code);
  if (opts.download) params.set("download", "1");
  if (opts.v != null) params.set("v", String(opts.v));
  return `/api/promo-image/${encodeURIComponent(slug)}?${params.toString()}`;
}

/** Download file name, e.g. "sakai-store-mobile-legends-story.png". */
export function promoImageFileName(storeName: string, slug: string, format: PromoFormat): string {
  const store =
    storeName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "store";
  return `${store}-${slug}-${format}.png`;
}
