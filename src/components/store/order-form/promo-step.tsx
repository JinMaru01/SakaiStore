"use client";

import { BadgePercent, CircleAlert, CircleCheck, X } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { useT } from "@/i18n/client";
import { formatUsd } from "@/lib/utils";
import { followTermsText, promoErrorText } from "./promo-text";
import { Step } from "./step";
import type { FollowTerms, PromoState } from "./types";

type Props = {
  value: string;
  state: PromoState;
  followCode: string;
  /** Conditions of the follower code (min order, first top-up only), shown with its button. */
  followTerms?: FollowTerms | null;
  onChange: (v: string) => void;
  onApply: () => void;
  onRemove: () => void;
  onUseFollowCode: () => void;
};

export function PromoStep({ value, state, followCode, followTerms, onChange, onApply, onRemove, onUseFollowCode }: Props) {
  const t = useT();
  const applied = state.status === "applied" ? state : null;
  const followConditions = followTermsText(t, followTerms);

  return (
    <Step n={3} id="step-promo" title={t("game.steps.promo")} optional={t("game.optional")}>
      {applied ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-3">
          <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">
              {t("game.promo.applied", { code: applied.code, amount: formatUsd(applied.discountCents) })}
            </p>
            {/* Conditions (minimum, cap) must stay readable on 360px phones: wrap, never truncate. */}
            {applied.description && <p className="break-words text-muted">{applied.description}</p>}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t("game.promo.remove")}
          </button>
        </div>
      ) : (
        <>
          <Label htmlFor="promoCode" className="sr-only">
            {t("game.promo.label")}
          </Label>
          <div className="flex gap-2">
            <Input
              id="promoCode"
              name="promoCode"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                // Enter applies the code instead of submitting the whole order.
                if (e.key === "Enter") {
                  e.preventDefault();
                  onApply();
                }
              }}
              placeholder={t("game.promo.placeholder")}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={32}
              aria-invalid={state.status === "error" ? true : undefined}
              aria-describedby="promo-status"
              className="font-display text-base tracking-wider uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={onApply}
              loading={state.status === "loading"}
              disabled={!value.trim()}
              className="h-11 shrink-0"
            >
              {t("game.promo.apply")}
            </Button>
          </div>
        </>
      )}

      <div id="promo-status" role="status" aria-live="polite">
        {state.status === "error" && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            {promoErrorText(t, state)}
          </p>
        )}
      </div>

      {followCode && !applied && (
        <button
          type="button"
          onClick={onUseFollowCode}
          className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/10"
        >
          <BadgePercent className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex-1 text-muted">
            {t("game.promo.followHint")}
            {followConditions && <span className="mt-0.5 block text-xs text-muted">{followConditions}</span>}
          </span>
          <span className="rounded-md bg-bg/60 px-2 py-0.5 font-display font-bold tracking-wider text-accent">
            {followCode}
          </span>
        </button>
      )}
    </Step>
  );
}
