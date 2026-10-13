import type { Game, Package } from "@/db/schema";
import type { Locale } from "@/i18n/config";

/** Customer-safe subset of a game passed to the client order form. */
export type FormGame = Pick<
  Game,
  | "slug"
  | "name"
  | "currencyName"
  | "accentColor"
  | "imageUrl"
  | "idLabel"
  | "idPattern"
  | "idHelp"
  | "requiresZone"
  | "zoneLabel"
  | "zonePattern"
  | "zoneOptions"
>;

/** Customer-safe package (no supplier SKU / internal fields). */
export type FormPackage = Pick<
  Package,
  "id" | "name" | "amount" | "bonus" | "priceCents" | "compareAtCents" | "badge"
>;

/**
 * Admin-authored catalog text in the visitor's language: the Khmer column
 * when the locale is km and it is filled in, else the English one.
 */
export function localizedText(locale: Locale, en: string | null | undefined, km: string | null | undefined): string | null {
  const pick = locale === "km" && km?.trim() ? km : en;
  return pick?.trim() ? pick : null;
}

export function toFormGame(g: Game, locale: Locale = "en"): FormGame {
  return {
    slug: g.slug,
    name: g.name,
    currencyName: g.currencyName,
    accentColor: g.accentColor,
    imageUrl: g.imageUrl,
    idLabel: g.idLabel,
    idPattern: g.idPattern,
    idHelp: localizedText(locale, g.idHelp, g.idHelpKm),
    requiresZone: g.requiresZone,
    zoneLabel: g.zoneLabel,
    zonePattern: g.zonePattern,
    zoneOptions: Array.isArray(g.zoneOptions) ? g.zoneOptions : null,
  };
}

export function toFormPackage(p: Package): FormPackage {
  return {
    id: p.id,
    name: p.name,
    amount: p.amount,
    bonus: p.bonus,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    badge: p.badge,
  };
}

/** POST /api/promo/validate success body (description is in the visitor's language). */
export type PromoValidateResponse = {
  ok: true;
  code: string;
  description: string | null;
  discountCents: number;
  subtotalCents: number;
  totalCents: number;
};

/** Conditions of the follower promo code shown next to its call to action (null = none to show). */
export type FollowTerms = { minOrderCents: number; firstOrderOnly: boolean };

export type PromoState =
  | { status: "idle" }
  | { status: "loading"; code: string }
  | {
      status: "applied";
      code: string;
      packageId: number;
      discountCents: number;
      description: string | null;
      /** "<playerId>|<zoneId>" the code was checked for ("" = no player yet); first-order codes depend on it. */
      playerKey: string;
    }
  /** `minOrderCents` comes with min_order errors so the message can name the amount. */
  | { status: "error"; code: string; error: string; minOrderCents?: number };

/** Minimum order (cents) carried by a min_order error body, if any. */
export function minOrderFrom(body: unknown): number | undefined {
  const v = (body as { minOrderCents?: unknown } | null | undefined)?.minOrderCents;
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;
}

/**
 * What a successful POST /api/players/lookup checked:
 *  - found: the provider returned the player's name;
 *  - format_only: no name lookup exists for this store (PLAYER_LOOKUP_MODE=none), only the ID format was checked;
 *  - unavailable: the name provider failed, only the ID format was checked.
 */
export type LookupOutcome = "found" | "format_only" | "unavailable";

/** POST /api/players/lookup success body. */
export type PlayerLookupResponse = {
  ok: true;
  playerName: string | null;
  playerId: string;
  zoneId: string | null;
  lookup?: LookupOutcome;
};

/** Never report "found" without a name to show; older servers sent no `lookup` field. */
export function lookupOutcome(res: Pick<PlayerLookupResponse, "playerName" | "lookup">): LookupOutcome {
  if (res.lookup === "format_only" || res.lookup === "unavailable") return res.lookup;
  if (res.playerName) return "found";
  return res.lookup === "found" ? "format_only" : "unavailable";
}

export type LookupState =
  | { key: string; status: "loading" }
  | { key: string; status: "ok"; playerName: string | null; outcome: LookupOutcome }
  | { key: string; status: "error"; error: string };
