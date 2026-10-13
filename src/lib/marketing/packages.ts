/**
 * Package selection for promo images, OG images and captions. Pure; safe for
 * server and client.
 */

export type PromoPackage = {
  name: string;
  priceCents: number;
  compareAtCents?: number | null;
  badge?: string | null;
};

/** Weekly / monthly passes, memberships, cards (MLBB Weekly Diamond Pass, FF Membership, Welkin Moon …). */
const PASS_PATTERN = /\b(pass|membership|card|welkin|subscription)\b/i;

export function isPassPackage(p: Pick<PromoPackage, "name">): boolean {
  return PASS_PATTERN.test(p.name);
}

export function isOnSale(p: PromoPackage): boolean {
  return p.compareAtCents != null && p.compareAtCents > p.priceCents && p.priceCents > 0;
}

/** Whole-percent saving vs the compare-at price, or null when not on sale. */
export function discountPercent(p: PromoPackage): number | null {
  if (!isOnSale(p)) return null;
  const pct = Math.round(((p.compareAtCents! - p.priceCents) / p.compareAtCents!) * 100);
  return pct > 0 ? pct : null;
}

const BADGE_SCORE: Record<string, number> = { best: 4, hot: 3, promo: 3, sale: 3, new: 2 };

function score(p: PromoPackage): number {
  let s = BADGE_SCORE[(p.badge ?? "").trim().toLowerCase()] ?? (p.badge ? 1 : 0);
  if (isOnSale(p)) s += 2;
  return s;
}

/**
 * Up to `n` packages worth advertising: badged / on-sale ones first, the rest
 * spread across the price range (a cheap pack, a mid pack, a big pack) so the
 * list reads as "something for everyone". Returned in the original (admin
 * sort) order. Free packages are skipped.
 */
export function pickHighlightPackages<T extends PromoPackage>(packages: readonly T[], n: number): T[] {
  const indexed = packages.map((p, i) => ({ p, i })).filter(({ p }) => p.priceCents > 0);
  if (n <= 0 || indexed.length === 0) return [];
  if (indexed.length <= n) return indexed.map(({ p }) => p);

  const chosen = new Set<number>();
  const ranked = indexed
    .filter(({ p }) => score(p) > 0)
    .sort((a, b) => score(b.p) - score(a.p) || a.p.priceCents - b.p.priceCents);
  // Leave room for at least one "spread" pick when we pick more than two.
  const maxRanked = n > 2 ? n - 1 : n;
  for (const { i } of ranked.slice(0, maxRanked)) chosen.add(i);

  const byPrice = indexed.filter(({ i }) => !chosen.has(i)).sort((a, b) => a.p.priceCents - b.p.priceCents);
  const need = n - chosen.size;
  for (let k = 0; k < need && byPrice.length > 0; k++) {
    // Evenly spaced quantiles: 0, 1/(need-1), …, 1 of the remaining price range.
    const pos = need === 1 ? 0 : Math.round((k * (byPrice.length - 1)) / (need - 1));
    const pick = byPrice[Math.min(pos, byPrice.length - 1)]!;
    if (chosen.has(pick.i)) {
      const next = byPrice.find(({ i }) => !chosen.has(i));
      if (next) chosen.add(next.i);
    } else chosen.add(pick.i);
  }
  return indexed.filter(({ i }) => chosen.has(i)).map(({ p }) => p);
}

/** Packages for a price list of at most `n` rows: everything when it fits, else the highlights. */
export function pickListPackages<T extends PromoPackage>(packages: readonly T[], n: number): T[] {
  const paid = packages.filter((p) => p.priceCents > 0);
  return paid.length <= n ? paid : pickHighlightPackages(paid, n);
}

/** Cheapest price in cents, or null. */
export function minPrice(packages: readonly PromoPackage[]): number | null {
  const prices = packages.map((p) => p.priceCents).filter((c) => c > 0);
  return prices.length ? Math.min(...prices) : null;
}
