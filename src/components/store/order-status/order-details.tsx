"use client";

import { Gamepad2 } from "lucide-react";
import { useT } from "@/i18n/client";
import type { PublicOrder } from "@/lib/orders/public";
import { cn, formatKhr, formatUsd } from "@/lib/utils";
import { CopyButton } from "../copy-button";
import { formatDateTime } from "./helpers";

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2", className)}>
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right break-words text-fg">{children}</dd>
    </div>
  );
}

/** Order code, game/package/player and the price breakdown. */
export function OrderDetails({ order, khrPerUsd }: { order: PublicOrder; khrPerUsd: number }) {
  const t = useT();
  return (
    <section
      aria-labelledby="order-details-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5"
    >
      <h2 id="order-details-title" className="flex items-center gap-2 font-display font-semibold">
        <Gamepad2 className="h-4 w-4 text-primary" aria-hidden="true" />
        {t("order.details.title")}
      </h2>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">{t("order.details.code")}</p>
          <p className="font-display text-lg font-bold tracking-wider">{order.code}</p>
        </div>
        <CopyButton value={order.code} iconOnly ariaLabel={t("order.details.copyCode")} />
      </div>

      <dl className="mt-2 divide-y divide-border/60 text-sm">
        <Row label={t("order.details.game")}>{order.gameName}</Row>
        <Row label={t("order.details.package")}>{order.packageName}</Row>
        <Row label={t("order.details.playerId")}>
          <span className="font-medium">{order.playerId}</span>
          {order.zoneId && <span className="text-muted"> ({order.zoneId})</span>}
        </Row>
        {order.playerName && (
          <Row label={t("order.details.playerName")}>
            <span className="font-medium text-success">{order.playerName}</span>
          </Row>
        )}
        <Row label={t("order.details.createdAt")}>{formatDateTime(order.createdAt)}</Row>
        {order.paidAt && <Row label={t("order.details.paidAt")}>{formatDateTime(order.paidAt)}</Row>}
        {order.deliveredAt && <Row label={t("order.details.deliveredAt")}>{formatDateTime(order.deliveredAt)}</Row>}
      </dl>

      <dl className="mt-2 space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("order.details.subtotal")}</dt>
          <dd>{formatUsd(order.unitPriceCents)}</dd>
        </div>
        {order.discountCents > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">
              {order.promoCode
                ? t("order.details.discountCode", { code: order.promoCode })
                : t("order.details.discount")}
            </dt>
            <dd className="text-success">−{formatUsd(order.discountCents)}</dd>
          </div>
        )}
        <div className="flex items-end justify-between gap-4 pt-1.5">
          <dt className="font-medium">{t("order.details.total")}</dt>
          <dd className="text-right">
            <span className="block font-display text-xl font-bold">{formatUsd(order.totalCents)}</span>
            <span className="block text-xs text-muted">≈ {formatKhr(order.totalCents, khrPerUsd)}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
