import type { Game, Package } from "@/db/schema";

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

export function toFormGame(g: Game): FormGame {
  return {
    slug: g.slug,
    name: g.name,
    currencyName: g.currencyName,
    accentColor: g.accentColor,
    imageUrl: g.imageUrl,
    idLabel: g.idLabel,
    idPattern: g.idPattern,
    idHelp: g.idHelp,
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

/** POST /api/promo/validate success body. */
export type PromoValidateResponse = {
  ok: true;
  code: string;
  description: string | null;
  discountCents: number;
  subtotalCents: number;
  totalCents: number;
};

export type PromoState =
  | { status: "idle" }
  | { status: "loading"; code: string }
  | { status: "applied"; code: string; packageId: number; discountCents: number; description: string | null }
  | { status: "error"; code: string; error: string };

export type LookupState =
  | { key: string; status: "loading" }
  | { key: string; status: "ok"; playerName: string | null }
  | { key: string; status: "error"; error: string };
