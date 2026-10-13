"use client";

import { CircleAlert, Lock, QrCode } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n/client";
import { cn, formatKhr, formatUsd } from "@/lib/utils";
import { GameArt } from "../game-tile";
import { richText } from "../rich-text";
import type { FormGame, FormPackage } from "./types";

/** id of the <form> in order-form.tsx; the Pay buttons sit outside it. */
export const ORDER_FORM_ID = "order-form";

/**
 * CSS variable with the mobile pay bar's real height (it grows with an error
 * or a wrapped Khmer line). The floating chat bubble and the footer use it to
 * stay clear of the bar.
 */
export const BOTTOM_BAR_HEIGHT_VAR = "--bottom-bar-h";

export type SummaryProps = {
  game: FormGame;
  pkg: FormPackage | null;
  playerId: string;
  zoneId: string;
  playerName: string | null;
  promoCode: string | null;
  discountCents: number;
  khrPerUsd: number;
  submitting: boolean;
  error: string | null;
};

function PayButton({ submitting, className }: { submitting: boolean; className?: string }) {
  const t = useT();
  return (
    <Button type="submit" form={ORDER_FORM_ID} size="lg" loading={submitting} className={cn("w-full", className)}>
      {!submitting && <QrCode className="h-5 w-5" aria-hidden="true" />}
      {submitting ? t("game.summary.creating") : t("game.summary.pay")}
    </Button>
  );
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("min-w-0 text-right break-words", strong && "font-semibold text-fg")}>{children}</dd>
    </div>
  );
}

/** Desktop: sticky side card with the full breakdown and the Pay button. */
export function SummaryCard(p: SummaryProps) {
  const t = useT();
  const subtotal = p.pkg?.priceCents ?? 0;
  const total = Math.max(0, subtotal - p.discountCents);
  const player = p.playerId ? (p.zoneId ? `${p.playerId} (${p.zoneId})` : p.playerId) : "—";

  return (
    <aside aria-labelledby="summary-title" className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <GameArt game={p.game} className="w-12 rounded-xl" sizes="48px" hideCurrency />
        <div className="min-w-0">
          <h2 id="summary-title" className="font-display font-semibold">
            {t("game.summary.title")}
          </h2>
          <p className="truncate text-sm text-muted">{p.game.name}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 text-sm">
        <Row label={t("game.summary.player")}>
          <span className="font-medium text-fg">{player}</span>
          {p.playerName && <span className="block text-xs text-success">{p.playerName}</span>}
        </Row>
        <Row label={t("game.summary.package")}>{p.pkg ? p.pkg.name : t("game.summary.noPackage")}</Row>
        <div className="my-3 border-t border-dashed border-border" />
        <Row label={t("game.summary.subtotal")}>{formatUsd(subtotal)}</Row>
        {p.discountCents > 0 && (
          <Row label={p.promoCode ? t("game.summary.discountCode", { code: p.promoCode }) : t("game.summary.discount")}>
            <span className="text-success">−{formatUsd(p.discountCents)}</span>
          </Row>
        )}
      </dl>

      <div className="mt-4 flex items-end justify-between rounded-xl bg-surface-2 px-4 py-3">
        <span className="text-sm font-medium">{t("game.summary.total")}</span>
        <span className="text-right">
          <span className="block font-display text-2xl font-bold text-fg">{formatUsd(total)}</span>
          <span className="block text-xs text-muted">≈ {formatKhr(total, p.khrPerUsd)}</span>
        </span>
      </div>

      {p.error && <SubmitError message={p.error} className="mt-4" />}

      <PayButton submitting={p.submitting} className="mt-4" />
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        {t("game.summary.secure")}
      </p>
      <AgreeLine className="mt-2 text-xs" />
    </aside>
  );
}

/**
 * "By paying you agree to our Terms and Privacy Policy" with links. Shown next
 * to every Pay button (desktop card and the phone bar), because the terms carry
 * the wrong-ID / no-refund rules customers accept at checkout.
 */
export function AgreeLine({ className }: { className?: string }) {
  const t = useT();
  return (
    <p data-agree className={cn("text-center text-muted", className)}>
      {richText(t("game.summary.agree"), {
        terms: (c) => (
          <Link href="/terms" className="underline underline-offset-2 hover:text-fg">
            {c}
          </Link>
        ),
        privacy: (c) => (
          <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
            {c}
          </Link>
        ),
      })}
    </p>
  );
}

export function SubmitError({ message, className }: { message: string; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-fg",
        className,
      )}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Phones: fixed bottom bar with the total and the Pay button, always in reach
 * of the thumb. `data-bottom-bar` lets the floating chat and footer make room.
 */
export function MobileBar(p: SummaryProps) {
  const t = useT();
  const subtotal = p.pkg?.priceCents ?? 0;
  const total = Math.max(0, subtotal - p.discountCents);
  const barRef = useBarHeightVar();
  return (
    <div
      ref={barRef}
      data-bottom-bar
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-12px_rgb(0_0_0/0.7)] backdrop-blur-xl lg:hidden"
    >
      {p.error && <SubmitError message={p.error} className="mb-2.5" />}
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1" aria-live="polite">
          {p.pkg ? (
            <>
              <p className="truncate text-xs text-muted">{p.pkg.name}</p>
              <p className="flex items-baseline gap-2">
                <span className="font-display text-xl font-bold">{formatUsd(total)}</span>
                {p.discountCents > 0 && <s className="text-xs text-muted">{formatUsd(subtotal)}</s>}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{t("game.summary.noPackage")}</p>
          )}
        </div>
        <PayButton submitting={p.submitting} className="w-auto shrink-0 px-5" />
      </div>
      <AgreeLine className="mx-auto mt-1.5 max-w-xl text-[11px]" />
    </div>
  );
}

/** Publish the bar's rendered height as BOTTOM_BAR_HEIGHT_VAR on <html> while it is mounted. */
function useBarHeightVar() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty(BOTTOM_BAR_HEIGHT_VAR, `${Math.ceil(el.getBoundingClientRect().height)}px`);
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty(BOTTOM_BAR_HEIGHT_VAR);
    };
  }, []);
  return ref;
}
