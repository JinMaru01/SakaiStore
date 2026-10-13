import type { ChannelStat, DailyRevenue, TopGame } from "@/lib/admin/stats";
import { formatDayKey, formatPercent, formatUsdCompact, formatWeekday, niceCeiling } from "@/lib/admin/format";
import { cn, formatNumber, formatUsd } from "@/lib/utils";
import { ChannelIcon, channelLabel } from "./badges";

/**
 * Dashboard charts — plain HTML/CSS (no chart library), server-rendered.
 * One series per chart in the primary color, hairline grid, thin columns
 * with rounded data ends, hover/focus tooltips per mark, and a visually
 * hidden data table so every value is reachable without a pointer.
 */

const GRID_STEPS = [1, 0.5, 0];

export function RevenueChart({ days, todayKey }: { days: DailyRevenue[]; todayKey: string }) {
  const max = niceCeiling(Math.max(0, ...days.map((d) => d.revenueCents))) || 1000;
  const total = days.reduce((s, d) => s + d.revenueCents, 0);
  const peak = days.reduce<DailyRevenue | null>((best, d) => (d.revenueCents > (best?.revenueCents ?? 0) ? d : best), null);

  return (
    <figure>
      <figcaption className="sr-only">
        Revenue per day for the last {days.length} days, total {formatUsd(total)}.
      </figcaption>
      <div className="flex gap-2">
        {/* Y axis */}
        <div className="relative h-44 w-11 shrink-0 sm:h-52 lg:h-72 text-right text-[11px] text-muted tabular-nums" aria-hidden="true">
          {GRID_STEPS.map((f) => (
            <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
              {formatUsdCompact(max * f)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-44 sm:h-52 lg:h-72">
            {GRID_STEPS.map((f) => (
              <div
                key={f}
                aria-hidden="true"
                className={cn("absolute inset-x-0 h-px", f === 0 ? "bg-border" : "bg-border/50")}
                style={{ top: `${(1 - f) * 100}%` }}
              />
            ))}
            <ol className="absolute inset-0 flex items-end gap-0.5 sm:gap-1">
              {days.map((d) => {
                const pct = (d.revenueCents / max) * 100;
                const isToday = d.date === todayKey;
                const showLabel = d.revenueCents > 0 && (isToday || d === peak);
                const label = `${formatWeekday(d.date)} ${formatDayKey(d.date)}: ${formatUsd(d.revenueCents)} from ${d.paidOrders} paid order${d.paidOrders === 1 ? "" : "s"}`;
                return (
                  <li
                    key={d.date}
                    tabIndex={0}
                    aria-label={label}
                    className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-sm outline-offset-1"
                  >
                    {showLabel && (
                      <span
                        aria-hidden="true"
                        className="mb-1 text-[10px] leading-none font-medium whitespace-nowrap text-fg tabular-nums"
                      >
                        {formatUsdCompact(d.revenueCents)}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "w-full max-w-6 rounded-t-[4px] bg-primary transition-[filter] group-hover:brightness-125 group-focus-visible:brightness-125",
                        !isToday && "bg-primary/75",
                      )}
                      style={{ height: d.revenueCents > 0 ? `max(2px, ${pct}%)` : 0 }}
                    />
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg border border-border bg-surface-3 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl shadow-black/40 group-hover:block group-focus-visible:block"
                    >
                      <span className="block font-semibold text-fg tabular-nums">{formatUsd(d.revenueCents)}</span>
                      <span className="block text-muted">
                        {formatWeekday(d.date)} {formatDayKey(d.date)} · {d.paidOrders} paid
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          {/* X axis: day of month (the card subtitle names the date range) */}
          <div className="mt-1.5 flex gap-0.5 text-center text-[10px] text-muted tabular-nums sm:gap-1" aria-hidden="true">
            {days.map((d) => (
              <span key={d.date} className={cn("min-w-0 flex-1", d.date === todayKey && "font-semibold text-fg")}>
                {Number(d.date.slice(8))}
              </span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>Daily revenue</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Revenue</th>
            <th scope="col">Paid orders</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">
                {formatWeekday(d.date)} {formatDayKey(d.date)}
              </th>
              <td>{formatUsd(d.revenueCents)}</td>
              <td>{d.paidOrders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Sales by marketing channel: revenue share bars + orders / paid / conversion. */
export function ChannelBreakdown({ stats }: { stats: ChannelStat[] }) {
  const totalRevenue = stats.reduce((s, c) => s + c.revenueCents, 0);
  const totalOrders = stats.reduce((s, c) => s + c.orders, 0);
  // Biggest first, but keep channels with no orders at the end in their fixed order.
  const rows = [...stats].sort((a, b) => b.revenueCents - a.revenueCents || b.orders - a.orders);

  if (totalOrders === 0) {
    return <p className="py-6 text-center text-sm text-muted">No orders in the last 30 days yet.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-3.5">
      {rows.map((c) => {
        const share = totalRevenue ? c.revenueCents / totalRevenue : 0;
        const conversion = c.orders ? c.paidOrders / c.orders : null;
        return (
          <li key={c.channel} className={cn(c.orders === 0 && "opacity-60")}>
            <div className="flex items-center gap-2 text-sm">
              <ChannelIcon channel={c.channel} />
              <span className="font-medium text-fg">{channelLabel(c.channel)}</span>
              <span className="ml-auto font-semibold text-fg tabular-nums">{formatUsd(c.revenueCents)}</span>
              <span className="w-12 text-right text-xs text-muted tabular-nums">{formatPercent(share, 0)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${share * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted tabular-nums">
              {formatNumber(c.orders)} order{c.orders === 1 ? "" : "s"} · {formatNumber(c.paidOrders)} paid
              {conversion != null && ` (${formatPercent(conversion, 0)})`}
              {c.avgOrderCents > 0 && ` · avg ${formatUsd(c.avgOrderCents)}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Best sellers by revenue with a bar relative to the #1 game. */
export function TopGamesList({ games }: { games: TopGame[] }) {
  if (games.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No paid orders in the last 30 days yet.</p>;
  }
  const top = games[0]!.revenueCents || 1;
  return (
    <ol className="grid grid-cols-1 gap-3.5">
      {games.map((g, i) => (
        <li key={g.gameSlug}>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-4 shrink-0 text-xs text-muted tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-fg">{g.gameName}</span>
            <span className="font-semibold text-fg tabular-nums">{formatUsd(g.revenueCents)}</span>
          </div>
          <div className="mt-1.5 ml-6 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(g.revenueCents / top) * 100}%` }} />
            </div>
            <span className="w-20 shrink-0 text-right text-xs text-muted tabular-nums">
              {formatNumber(g.paidOrders)} order{g.paidOrders === 1 ? "" : "s"}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
