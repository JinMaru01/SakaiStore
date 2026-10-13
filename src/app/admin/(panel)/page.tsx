import {
  Banknote,
  CalendarDays,
  CalendarRange,
  Inbox,
  PackageCheck,
  Percent,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChannelBadge, OrderStatusBadge } from "@/components/admin/badges";
import { ChannelBreakdown, RevenueChart, TopGamesList } from "@/components/admin/charts";
import { CopyButton } from "@/components/admin/copy-button";
import { EmptyState } from "@/components/admin/data-table";
import { QuickOrderActions } from "@/components/admin/order-actions";
import { PageHeader, SectionTitle } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { buttonClasses, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatAgo, formatDayKey, formatPercent, formatShortDateTime, formatWeekday } from "@/lib/admin/format";
import { NEEDS_ACTION_STATUSES, orderFiltersToQuery, EMPTY_FILTERS } from "@/lib/admin/order-filters";
import {
  getChannelStats,
  getDailyRevenue,
  getDashboardKpis,
  getNeedsDelivery,
  getRecentOrders,
  getTopGames,
} from "@/lib/admin/stats";
import { lastDaysWindow, storeDateKey } from "@/lib/admin/time";
import { requireAdmin } from "@/lib/auth";
import { formatNumber, formatUsd } from "@/lib/utils";
import { orderAction } from "./orders/actions";

export const metadata: Metadata = { title: "Dashboard" };

const QUEUE_LIMIT = 20;
const NEEDS_ACTION_HREF = `/admin/orders?${orderFiltersToQuery({ ...EMPTY_FILTERS, statuses: [...NEEDS_ACTION_STATUSES] })}`;

export default async function DashboardPage() {
  await requireAdmin();
  const now = new Date();
  const window30 = lastDaysWindow(30, now);
  const [kpis, daily, channels, topGames, queue, recent] = await Promise.all([
    getDashboardKpis(now),
    getDailyRevenue(14, now),
    getChannelStats(window30),
    getTopGames(window30, 5),
    getNeedsDelivery(QUEUE_LIMIT),
    getRecentOrders(8),
  ]);
  const todayKey = storeDateKey(now);
  const queueTotal = kpis.awaitingDelivery + kpis.failed;
  const total14 = daily.reduce((s, d) => s + d.revenueCents, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${formatWeekday(todayKey)} ${formatDayKey(todayKey)} · Phnom Penh time · figures by order date`}
        actions={
          <Link href="/admin/orders" className={buttonClasses("secondary", "md")}>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            All orders
          </Link>
        }
      />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Revenue today" value={formatUsd(kpis.revenueTodayCents)} icon={Banknote} />
        <StatCard label="Revenue 7 days" value={formatUsd(kpis.revenue7dCents)} icon={CalendarDays} />
        <StatCard label="Revenue 30 days" value={formatUsd(kpis.revenue30dCents)} icon={CalendarRange} />
        <StatCard label="Paid orders today" value={formatNumber(kpis.paidOrdersToday)} icon={TrendingUp} />
        <StatCard
          label="Awaiting delivery"
          value={formatNumber(kpis.awaitingDelivery)}
          sub={kpis.failed > 0 ? `+ ${formatNumber(kpis.failed)} failed` : "Paid, not delivered yet"}
          icon={PackageCheck}
          tone={queueTotal > 0 ? "attention" : "default"}
          href={NEEDS_ACTION_HREF}
        />
        <StatCard
          label="Payment conversion 7d"
          value={formatPercent(kpis.conversion7d.rate)}
          sub={`${formatNumber(kpis.conversion7d.paid)} paid of ${formatNumber(kpis.conversion7d.created)} orders`}
          icon={Percent}
        />
      </section>

      <section aria-labelledby="queue-title" className="mt-6">
        <SectionTitle
          id="queue-title"
          action={
            queueTotal > queue.length ? (
              <Link href={NEEDS_ACTION_HREF} className="text-sm font-medium text-primary hover:text-fg">
                View all {formatNumber(queueTotal)}
              </Link>
            ) : undefined
          }
        >
          Needs delivery{queueTotal > 0 && <span className="ml-2 text-muted">({formatNumber(queueTotal)})</span>}
        </SectionTitle>
        <p className="mt-0.5 text-sm text-muted">Oldest first. Top up the player in-game, then mark it delivered.</p>
        {queue.length === 0 ? (
          <EmptyState icon={Inbox} title="All caught up" className="mt-3">
            New paid orders show up here (and in your Telegram alerts).
          </EmptyState>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {queue.map((o) => (
              <li key={o.id}>
                <Card className="p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-mono text-sm font-semibold text-fg underline-offset-4 hover:underline"
                    >
                      {o.code}
                    </Link>
                    <OrderStatusBadge status={o.status} />
                    <span className="ml-auto text-xs text-muted">
                      {o.paidAt ? `paid ${formatAgo(o.paidAt, now)}` : `created ${formatAgo(o.createdAt, now)}`}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-medium text-fg">{o.packageName}</span>
                    <span className="text-muted"> · {o.gameName} · </span>
                    <span className="font-medium text-fg">{formatUsd(o.totalCents)}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CopyButton value={o.playerId} label="player ID" showValue />
                    {o.zoneId && <CopyButton value={o.zoneId} label="zone ID" showValue />}
                    {o.playerName && <span className="text-sm text-muted">“{o.playerName}”</span>}
                  </div>
                  <QuickOrderActions orderId={o.id} status={o.status} action={orderAction} className="mt-3" />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Revenue, last 14 days</CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                {formatDayKey(daily[0]!.date)} – {formatDayKey(todayKey)} · {formatUsd(total14)} total
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-4">
            <RevenueChart days={daily} todayKey={todayKey} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Sales by channel</CardTitle>
              <p className="mt-0.5 text-sm text-muted">Last 30 days · revenue share</p>
            </div>
            <Link href="/admin/marketing" className="shrink-0 text-sm font-medium text-primary hover:text-fg">
              Marketing
            </Link>
          </CardHeader>
          <CardContent>
            <ChannelBreakdown stats={channels} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Top games</CardTitle>
              <p className="mt-0.5 text-sm text-muted">Last 30 days · by revenue</p>
            </div>
          </CardHeader>
          <CardContent>
            <TopGamesList games={topGames} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <Link href="/admin/orders" className="text-sm font-medium text-primary hover:text-fg">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted sm:px-5">
                No orders yet. Share your store link on Facebook and TikTok to get the first one.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/50 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm">
                          <span className="font-mono font-semibold text-fg">{o.code}</span>
                          <span className="hidden sm:inline">
                            <ChannelBadge channel={o.channel} />
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted">
                          {o.packageName} · {o.gameName} · {formatShortDateTime(o.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-fg tabular-nums">{formatUsd(o.totalCents)}</span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
