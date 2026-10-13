import type { TranslateFn } from "@/i18n/translate";
import { formatUsd } from "@/lib/utils";
import { errorMessage } from "../api";
import type { FollowTerms, PromoState } from "./types";

/*
 * Customer-facing promo texts. A plain module (no "use client") so server
 * components (FollowUs) can call these helpers too.
 */

/** Promo-step error; min_order names the amount when the server sent it. */
export function promoErrorText(t: TranslateFn, state: Extract<PromoState, { status: "error" }>): string {
  if (state.error === "min_order" && state.minOrderCents) {
    return t("game.promoErrors.min_order_amount", { amount: formatUsd(state.minOrderCents) });
  }
  return errorMessage(t, "game.promoErrors", state.error);
}

/** Message next to Pay when the code could not be used (tapping Pay again continues without it). */
export function promoSubmitMessage(t: TranslateFn, error: string, minOrderCents?: number): string {
  if (error === "first_order_only") return t("game.errors.promo_first_order_only");
  if (error === "min_order" && minOrderCents) {
    return t("game.errors.promo_min_order", { amount: formatUsd(minOrderCents) });
  }
  return t("game.errors.promo_changed");
}

/** "For orders from $5.00 · First top-up only" for the follower code; null when it has no conditions. */
export function followTermsText(t: TranslateFn, terms: FollowTerms | null | undefined): string | null {
  if (!terms) return null;
  const parts = [
    terms.minOrderCents > 0 && t("social.follow.minOrder", { amount: formatUsd(terms.minOrderCents) }),
    terms.firstOrderOnly && t("social.follow.firstOrder"),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
