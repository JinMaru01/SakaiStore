"use client";

import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  Gamepad2,
  PartyPopper,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  WifiOff,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessengerIcon, TelegramIcon } from "@/components/icons/brand";
import type { ChatLinks } from "@/components/social/social-config";
import { ShareBar } from "@/components/social/share-bar";
import { Button, buttonClasses, Spinner, StatusBadge } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { PublicOrder } from "@/lib/orders/public";
import { track } from "@/lib/tracking/client";
import { cn, formatUsd } from "@/lib/utils";
import { apiRequest, errorMessage } from "../api";
import { hasRecentOrder, purchaseTrackedKey, RECENT_ORDERS_KEY } from "../recent-orders";
import { storageGet, storageSet } from "../storage";
import { formatCountdown, isPurchaseStatus, pollIntervalFor, remainingMs } from "./helpers";
import { DownloadQrButton, KhqrCard } from "./khqr-card";
import { OrderDetails } from "./order-details";
import { ProgressSteps } from "./progress-steps";
import { useNow } from "./use-now";
import { useOrderPolling } from "./use-order-polling";

type Props = {
  initialOrder: PublicOrder;
  merchantName: string;
  khrPerUsd: number;
  chat: ChatLinks;
  /** Game page to share once delivered (the order page itself is private). */
  share: { url: string; text: string; title: string };
  /** Server-rendered "Follow us" card, shown after a successful delivery. */
  followUs?: React.ReactNode;
};

const PANEL = "rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-7";

export function OrderView({ initialOrder, merchantName, khrPerUsd, chat, share, followUs }: Props) {
  const t = useT();
  const { order, setOrder, refresh, offline } = useOrderPolling(initialOrder);
  usePurchasePixel(order);

  const [action, setAction] = useState<null | "cancel" | "simulate">(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(kind: "cancel" | "simulate") {
    if (kind === "cancel" && !window.confirm(t("order.pending.cancelConfirm"))) return;
    setAction(kind);
    setActionError(null);
    const path = kind === "cancel" ? "cancel" : "simulate-payment";
    const res = await apiRequest<{ order: PublicOrder }>(`/api/orders/${encodeURIComponent(order.code)}/${path}`, {
      method: "POST",
      body: {},
    });
    setAction(null);
    if (res.ok) {
      if (res.data?.order) setOrder(res.data.order);
      return;
    }
    // 409 not_pending / 503 responses include the latest order: show it right away.
    const latest = (res.body as { order?: PublicOrder } | undefined)?.order;
    if (latest?.code === order.code) setOrder(latest);
    else if (res.error === "not_pending") void refresh();
    setActionError(errorMessage(t, "order.errors", res.error));
  }

  const status = order.status;
  const polling = pollIntervalFor(status) != null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {t("order.header.eyebrow")} <span className="font-display font-semibold text-fg">#{order.code}</span>
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t(`order.titles.${status}`)}</h1>
        </div>
        <div className="flex items-center gap-3">
          {polling && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {t("order.header.live")}
            </span>
          )}
          <StatusBadge status={status}>{t(`order.status.${status}`)}</StatusBadge>
        </div>
      </div>

      {/* Announce status changes to screen readers. */}
      <p className="sr-only" role="status" aria-live="polite">
        {t(`order.titles.${status}`)}
      </p>

      {offline && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
          <WifiOff className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          {t("order.errors.offline")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6">
          {status === "pending_payment" && order.khqr && (
            <PendingPanel
              order={order}
              khqr={order.khqr}
              merchantName={merchantName}
              onExpire={refresh}
              action={action}
              actionError={actionError}
              onCancel={() => runAction("cancel")}
              onSimulate={() => runAction("simulate")}
            />
          )}
          {status === "pending_payment" && !order.khqr && (
            <section className={cn(PANEL, "text-center")}>
              <Spinner className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-3 text-muted">{t("order.pending.preparing")}</p>
            </section>
          )}
          {(status === "paid" || status === "processing") && (
            <section className={PANEL} aria-labelledby="progress-title">
              <ProgressSteps status={status} />
              <h2 id="progress-title" className="mt-7 text-center font-display text-xl font-bold">
                {t(status === "paid" ? "order.paid.title" : "order.processing.title")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-center text-muted">
                {t(status === "paid" ? "order.paid.body" : "order.processing.body", {
                  package: order.packageName,
                  player: order.playerName ?? order.playerId,
                })}
              </p>
              <p className="mx-auto mt-5 flex max-w-md items-start gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {t("order.processing.eta")}
              </p>
            </section>
          )}
          {status === "delivered" && (
            <>
              <section className={cn(PANEL, "relative overflow-hidden text-center")} aria-labelledby="delivered-title">
                <div
                  aria-hidden="true"
                  className="absolute -top-24 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-success/20 blur-3xl"
                />
                <div className="relative">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success ring-8 ring-success/10">
                    <PartyPopper className="h-8 w-8" aria-hidden="true" />
                  </span>
                  <h2 id="delivered-title" className="mt-5 font-display text-2xl font-bold">
                    {t("order.delivered.title")}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-muted">
                    {t("order.delivered.body", {
                      package: order.packageName,
                      player: order.playerName ?? order.playerId,
                    })}
                  </p>
                  <div className="mx-auto mt-6 max-w-sm">
                    <ProgressSteps status={status} />
                  </div>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link href={`/games/${order.gameSlug}`} className={buttonClasses("primary", "lg")}>
                      <RotateCcw className="h-5 w-5" aria-hidden="true" />
                      {t("order.delivered.again")}
                    </Link>
                    <Link href="/#games" className={buttonClasses("secondary", "lg")}>
                      <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                      {t("order.delivered.otherGames")}
                    </Link>
                  </div>
                </div>
              </section>
              <ShareBar
                url={share.url}
                text={share.text}
                title={share.title}
                heading={t("order.delivered.shareHeading")}
              />
              {followUs}
            </>
          )}
          {(status === "failed" || status === "refunded") && (
            <section className={PANEL} aria-labelledby="problem-title">
              <TriangleAlert
                className={cn("h-10 w-10", status === "failed" ? "text-danger" : "text-muted")}
                aria-hidden="true"
              />
              <h2 id="problem-title" className="mt-4 font-display text-xl font-bold">
                {t(`order.${status}.title`)}
              </h2>
              <p className="mt-2 text-muted">{t(`order.${status}.body`, { code: order.code })}</p>
              <SupportButtons chat={chat} className="mt-5" />
            </section>
          )}
          {(status === "expired" || status === "cancelled") && (
            <section className={PANEL} aria-labelledby="closed-title">
              <XCircle className="h-10 w-10 text-muted" aria-hidden="true" />
              <h2 id="closed-title" className="mt-4 font-display text-xl font-bold">
                {t(`order.${status}.title`)}
              </h2>
              <p className="mt-2 text-muted">{t(`order.${status}.body`, { code: order.code })}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href={`/games/${order.gameSlug}`} className={buttonClasses("primary", "lg")}>
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  {t("order.closed.again")}
                </Link>
              </div>
              {status === "expired" && <SupportButtons chat={chat} className="mt-4" />}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <OrderDetails order={order} khrPerUsd={khrPerUsd} />
          {order.telegramLink && !order.telegramLinked && pollIntervalFor(status) != null && (
            <section className="rounded-[var(--radius-card)] border border-telegram/40 bg-telegram/10 p-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <TelegramIcon className="h-5 w-5 text-telegram" />
                {t("order.telegram.title")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("order.telegram.body")}</p>
              <a
                href={order.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-telegram px-4 text-sm font-semibold text-white hover:brightness-110"
              >
                <TelegramIcon className="h-4 w-4" />
                {t("order.telegram.button")}
              </a>
            </section>
          )}
          {order.telegramLinked && (
            <p className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
              <BadgeCheck className="h-4 w-4 text-telegram" aria-hidden="true" />
              {t("order.telegram.linked")}
            </p>
          )}
          {(chat.messenger || chat.telegram) && (
            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <h2 className="font-semibold">{t("order.help.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("order.help.body", { code: order.code })}</p>
              <SupportButtons chat={chat} className="mt-3" compact />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function PendingPanel({
  order,
  khqr,
  merchantName,
  onExpire,
  action,
  actionError,
  onCancel,
  onSimulate,
}: {
  order: PublicOrder;
  khqr: string;
  merchantName: string;
  onExpire: () => void;
  action: null | "cancel" | "simulate";
  actionError: string | null;
  onCancel: () => void;
  onSimulate: () => void;
}) {
  const t = useT();
  const now = useNow();
  const left = now == null ? null : remainingMs(order.paymentExpiresAt, now);
  const expired = left != null && left <= 0;

  // When the timer hits zero, ask the server right away (it expires the order after a last payment check).
  useEffect(() => {
    if (expired) onExpire();
  }, [expired, onExpire]);

  return (
    <section className={PANEL} aria-labelledby="pay-title">
      <div className="grid grid-cols-1 gap-7 md:grid-cols-[19rem_minmax(0,1fr)] md:items-start">
        <div>
          <KhqrCard khqr={khqr} merchantName={merchantName} totalCents={order.totalCents} expired={expired} />
          <p
            className={cn(
              "mx-auto mt-4 flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium",
              expired
                ? "bg-surface-2 text-muted"
                : left != null && left < 60_000
                  ? "bg-danger/15 text-danger"
                  : "bg-warning/15 text-warning",
            )}
          >
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {expired ? (
              t("order.pending.expiredChecking")
            ) : (
              <span>
                {t("order.pending.expiresIn")}{" "}
                <span className="inline-block min-w-[3.25rem] font-display font-bold tabular-nums">
                  {left == null ? "--:--" : formatCountdown(left)}
                </span>
              </span>
            )}
          </p>
        </div>

        <div>
          <h2 id="pay-title" className="font-display text-xl font-bold sm:text-2xl">
            {t("order.pending.title", { amount: formatUsd(order.totalCents) })}
          </h2>
          <p className="mt-1.5 text-muted">{t("order.pending.subtitle")}</p>

          <ol className="mt-5 space-y-3">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e1232e]/15 font-display text-sm font-bold text-[#ff5a63]">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm sm:text-base">{t(`order.pending.${step}`)}</span>
              </li>
            ))}
          </ol>

          <p className="mt-5 flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              {t("order.pending.autoConfirm")}
              <span className="mt-1 flex items-center gap-2 text-muted">
                <Spinner className="h-3.5 w-3.5" />
                {t("order.pending.waiting")}
              </span>
            </span>
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DownloadQrButton khqr={khqr} code={order.code} />
            {order.paymentMode === "mock" && (
              <div>
                <Button
                  type="button"
                  variant="success"
                  onClick={onSimulate}
                  loading={action === "simulate"}
                  disabled={action !== null}
                  className="w-full"
                >
                  {t("order.pending.simulate")}
                </Button>
                <p className="mt-1.5 text-center text-xs text-warning">{t("order.pending.simulateNote")}</p>
              </div>
            )}
          </div>

          {actionError && (
            <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-danger">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {actionError}
            </p>
          )}

          <div className="mt-6 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              loading={action === "cancel"}
              disabled={action !== null}
              className="text-muted hover:text-danger"
            >
              {t("order.pending.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportButtons({ chat, className, compact }: { chat: ChatLinks; className?: string; compact?: boolean }) {
  const t = useT();
  if (!chat.messenger && !chat.telegram) return null;
  const btn = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 font-semibold text-white hover:brightness-110",
    compact ? "h-10 text-sm" : "h-11",
  );
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row", compact && "sm:flex-col", className)}>
      {chat.telegram && (
        <a
          href={chat.telegram}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("Contact")}
          className={cn(btn, "bg-telegram")}
        >
          <TelegramIcon className="h-4 w-4" />
          {t("social.chat.telegram")}
        </a>
      )}
      {chat.messenger && (
        <a
          href={chat.messenger}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("Contact")}
          className={cn(btn, "bg-messenger")}
        >
          <MessengerIcon className="h-4 w-4" />
          {t("social.chat.messenger")}
        </a>
      )}
    </div>
  );
}

/**
 * Fire the Purchase pixel exactly once per order, the first time we see it
 * paid. Only for orders placed on this device (or seen pending in this view)
 * so an admin or a friend opening a shared order link does not count as a sale.
 */
function usePurchasePixel(order: PublicOrder) {
  const sawPending = useRef(order.status === "pending_payment");
  const fired = useRef(false);
  const { status, code, totalCents, gameSlug, gameName, packageName } = order;

  const fire = useCallback(() => {
    track("Purchase", {
      contentId: gameSlug,
      contentName: `${gameName} - ${packageName}`,
      value: totalCents / 100,
      currency: "USD",
      orderCode: code,
    });
  }, [code, totalCents, gameSlug, gameName, packageName]);

  useEffect(() => {
    if (status === "pending_payment") sawPending.current = true;
    if (!isPurchaseStatus(status) || fired.current) return;
    const key = purchaseTrackedKey(code);
    if (storageGet(key)) return;
    if (!sawPending.current && !hasRecentOrder(storageGet(RECENT_ORDERS_KEY), code)) return;
    fired.current = true;
    storageSet(key, "1");
    fire();
  }, [status, code, fire]);
}
