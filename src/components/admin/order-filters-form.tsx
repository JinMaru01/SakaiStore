import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { buttonClasses, Input, Label, Select } from "@/components/ui";
import { CHANNELS } from "@/lib/attribution";
import { countActiveFilters, type OrderFilters } from "@/lib/admin/order-filters";
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";
import { CHANNEL_LABELS } from "./badges";

// Checked chips take the status colour (literal classes so Tailwind can see them).
const CHECKED_CHIP: Record<OrderStatus, string> = {
  pending_payment: "peer-checked:bg-warning/15 peer-checked:text-warning peer-checked:ring-warning/40",
  paid: "peer-checked:bg-info/15 peer-checked:text-info peer-checked:ring-info/40",
  processing: "peer-checked:bg-info/15 peer-checked:text-info peer-checked:ring-info/40",
  delivered: "peer-checked:bg-success/15 peer-checked:text-success peer-checked:ring-success/40",
  failed: "peer-checked:bg-danger/15 peer-checked:text-danger peer-checked:ring-danger/40",
  refunded: "peer-checked:bg-muted/20 peer-checked:text-fg peer-checked:ring-muted/50",
  expired: "peer-checked:bg-muted/20 peer-checked:text-fg peer-checked:ring-muted/50",
  cancelled: "peer-checked:bg-muted/20 peer-checked:text-fg peer-checked:ring-muted/50",
};

type Props = {
  filters: OrderFilters;
  games: { slug: string; name: string }[];
};

/**
 * GET form for the orders list: works without JavaScript and every filter
 * lands in the URL, so a filtered view can be bookmarked or shared and the
 * CSV export reuses it. Collapsed behind "Filters" on phones.
 */
export function OrderFiltersForm({ filters, games }: Props) {
  const active = countActiveFilters({ ...filters, q: null });
  const selected = new Set(filters.statuses);

  return (
    <form method="get" action="/admin/orders" className="grid grid-cols-1 gap-3" role="search" aria-label="Filter orders">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Label htmlFor="orders-q" className="sr-only">
            Search orders
          </Label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            id="orders-q"
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder="Order code, player ID, phone, @telegram…"
            maxLength={64}
            autoComplete="off"
            enterKeyHint="search"
            className="pl-10"
          />
        </div>
        <button type="submit" className={buttonClasses("primary", "md", "h-11")}>
          Search
        </button>
      </div>

      <details className="group rounded-xl border border-border bg-surface" open={active > 0 || undefined}>
        <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden="true" />
          Filters
          {active > 0 && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-fg">{active} active</span>
          )}
          <span className="ml-auto text-xs text-muted group-open:hidden">Show</span>
          <span className="ml-auto hidden text-xs text-muted group-open:inline">Hide</span>
        </summary>
        <div className="grid grid-cols-1 gap-4 border-t border-border p-3.5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Status</legend>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map((s) => (
                <label key={s} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="status"
                    value={s}
                    defaultChecked={selected.has(s)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-3 text-sm ring-1 transition-colors ring-inset",
                      "bg-surface-2 text-muted ring-border hover:text-fg",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                      CHECKED_CHIP[s],
                      "peer-checked:font-medium",
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="orders-game">Game</Label>
              <Select id="orders-game" name="game" defaultValue={filters.game ?? ""}>
                <option value="">All games</option>
                {games.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="orders-channel">Channel</Label>
              <Select id="orders-channel" name="channel" defaultValue={filters.channel ?? ""}>
                <option value="">All channels</option>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="orders-from">From</Label>
              <Input id="orders-from" name="from" type="date" defaultValue={filters.from ?? ""} />
            </div>
            <div>
              <Label htmlFor="orders-to">To</Label>
              <Input id="orders-to" name="to" type="date" defaultValue={filters.to ?? ""} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={buttonClasses("primary", "md")}>
              Apply filters
            </button>
            <Link href="/admin/orders" className={buttonClasses("ghost", "md")}>
              <X className="h-4 w-4" aria-hidden="true" />
              Reset
            </Link>
          </div>
        </div>
      </details>
    </form>
  );
}
