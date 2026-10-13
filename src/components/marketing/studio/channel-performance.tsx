import Link from "next/link";
import { ChannelIcon, channelLabel } from "@/components/admin/badges";
import { formatDayKey, formatPercent } from "@/lib/admin/format";
import { addDays, storeDateKey } from "@/lib/admin/time";
import type { CampaignStat, ChannelPerformance, PromoChannelUsage } from "@/lib/marketing/analytics";
import { PERIODS, type PeriodDays } from "@/lib/marketing/analytics";
import { cn, formatNumber, formatUsd } from "@/lib/utils";

const PROMO_CHANNEL_LABELS: Record<string, string> = {
  facebook: "Facebook codes",
  tiktok: "TikTok codes",
  telegram: "Telegram codes",
  other: "Other channel codes",
  none: "General codes (no channel)",
};

type Props = {
  performance: ChannelPerformance;
  promoUsage: PromoChannelUsage[];
  campaigns: CampaignStat[];
  /** Builds the studio URL for another period (keeps the selected game). */
  periodHref: (days: PeriodDays) => string;
};

/** Channel analytics: orders, paid, revenue, AOV, conversion per channel + promo codes + campaigns. */
export function ChannelPerformanceView({ performance, promoUsage, campaigns, periodHref }: Props) {
  const { rows, totals, days, window } = performance;
  const range = `${formatDayKey(storeDateKey(window.from))} – ${formatDayKey(storeDateKey(addDays(window.to, -1)))}`;
  const sorted = [...rows].sort((a, b) => b.revenueCents - a.revenueCents || b.orders - a.orders);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {range} · by order date (Phnom Penh) · “Paid” includes refunded/failed, revenue does not
        </p>
        <nav aria-label="Period" className="inline-flex self-start rounded-xl border border-border bg-surface-2 p-1">
          {PERIODS.map((d) => (
            <Link
              key={d}
              href={periodHref(d)}
              scroll={false}
              aria-current={d === days ? "page" : undefined}
              className={cn(
                "grid h-9 place-items-center rounded-lg px-3.5 text-sm font-medium transition-colors",
                d === days ? "bg-primary text-primary-fg" : "text-muted hover:text-fg",
              )}
            >
              {d} days
            </Link>
          ))}
        </nav>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Orders", formatNumber(totals.orders)],
          ["Paid orders", formatNumber(totals.paidOrders)],
          ["Revenue", formatUsd(totals.revenueCents)],
          ["Avg. order", totals.avgOrderCents ? formatUsd(totals.avgOrderCents) : "—"],
          ["Conversion", formatPercent(totals.conversionRate)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-surface-2/50 p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {totals.orders === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No orders in the last {days} days yet. Post your first price list and share the tracked links.
        </p>
      ) : (
        <>
          {/* Phones: one card per channel */}
          <ul className="mt-4 grid grid-cols-1 gap-2 md:hidden">
            {sorted.map((r) => (
              <li key={r.channel} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <ChannelIcon channel={r.channel} />
                  <span className="font-medium text-fg">{channelLabel(r.channel)}</span>
                  <span className="ml-auto font-semibold text-fg tabular-nums">{formatUsd(r.revenueCents)}</span>
                </div>
                <ShareBar share={r.revenueShare} className="mt-2" />
                <p className="mt-2 text-xs text-muted tabular-nums">
                  {formatNumber(r.orders)} orders · {formatNumber(r.paidOrders)} paid · {formatPercent(r.conversionRate)} conv. · AOV{" "}
                  {r.avgOrderCents ? formatUsd(r.avgOrderCents) : "—"}
                </p>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Orders and revenue by marketing channel, last {days} days</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th scope="col" className="px-4 py-2.5 font-medium">Channel</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Orders</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Paid</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Conversion</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Revenue</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Avg. order</th>
                  <th scope="col" className="w-40 px-4 py-2.5 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.channel} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="px-4 py-2.5 text-left font-medium">
                      <span className="flex items-center gap-2">
                        <ChannelIcon channel={r.channel} />
                        {channelLabel(r.channel)}
                      </span>
                    </th>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(r.orders)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(r.paidOrders)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatPercent(r.conversionRate)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatUsd(r.revenueCents)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.avgOrderCents ? formatUsd(r.avgOrderCents) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <ShareBar share={r.revenueShare} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="promo-usage-title">
          <h3 id="promo-usage-title" className="text-sm font-semibold text-fg">
            Promo codes by channel
          </h3>
          <p className="mt-0.5 text-xs text-muted">Orders that used a code, grouped by where the code is promoted.</p>
          {promoUsage.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No promo codes used yet.</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {promoUsage.map((g) => (
                <li key={g.promoChannel} className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-center gap-2">
                    {g.promoChannel !== "none" && <ChannelIcon channel={g.promoChannel} />}
                    <span className="text-sm font-medium text-fg">{PROMO_CHANNEL_LABELS[g.promoChannel]}</span>
                    <span className="ml-auto text-sm font-semibold text-fg tabular-nums">{formatUsd(g.revenueCents)}</span>
                  </div>
                  <table className="mt-2 w-full text-xs">
                    <caption className="sr-only">{PROMO_CHANNEL_LABELS[g.promoChannel]}</caption>
                    <thead className="text-muted">
                      <tr>
                        <th scope="col" className="py-1 text-left font-medium">Code</th>
                        <th scope="col" className="py-1 text-right font-medium">Orders</th>
                        <th scope="col" className="py-1 text-right font-medium">Paid</th>
                        <th scope="col" className="py-1 text-right font-medium">Revenue</th>
                        <th scope="col" className="py-1 text-right font-medium">Discount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.codes.map((c) => (
                        <tr key={c.code} className="border-t border-border/50">
                          <th scope="row" className="py-1.5 text-left font-mono font-semibold text-fg">
                            {c.code}
                            {c.active === false && <span className="ml-1.5 font-sans font-normal text-muted">(off)</span>}
                            {c.active === null && <span className="ml-1.5 font-sans font-normal text-muted">(deleted)</span>}
                          </th>
                          <td className="py-1.5 text-right tabular-nums">{formatNumber(c.orders)}</td>
                          <td className="py-1.5 text-right tabular-nums">{formatNumber(c.paidOrders)}</td>
                          <td className="py-1.5 text-right tabular-nums">{formatUsd(c.revenueCents)}</td>
                          <td className="py-1.5 text-right text-muted tabular-nums">{formatUsd(c.discountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="campaigns-title">
          <h3 id="campaigns-title" className="text-sm font-semibold text-fg">
            Top campaigns
          </h3>
          <p className="mt-0.5 text-xs text-muted">utm_campaign from your tracked links (game, template, bio…).</p>
          {campaigns.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No tracked links have brought orders yet — use the links from this page.</p>
          ) : (
            <ol className="mt-3 divide-y divide-border/60 rounded-xl border border-border bg-surface">
              {campaigns.map((c, i) => (
                <li key={`${c.channel}-${c.source}-${c.campaign}`} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-4 text-xs text-muted tabular-nums">{i + 1}</span>
                  <ChannelIcon channel={c.channel} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm text-fg">{c.campaign}</p>
                    <p className="text-xs text-muted">
                      {c.source ?? channelLabel(c.channel)} · {formatNumber(c.orders)} orders · {formatNumber(c.paidOrders)} paid
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-fg tabular-nums">{formatUsd(c.revenueCents)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function ShareBar({ share, className }: { share: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-muted tabular-nums">{formatPercent(share, 0)}</span>
    </div>
  );
}
