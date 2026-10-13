import { Download, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChannelBadge, ChannelIcon, channelLabel, OrderStatusBadge } from "@/components/admin/badges";
import { DataTable, EmptyState, type Column } from "@/components/admin/data-table";
import { OrderFiltersForm } from "@/components/admin/order-filters-form";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { buttonClasses } from "@/components/ui";
import { formatShortDateTime } from "@/lib/admin/format";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  NEEDS_ACTION_STATUSES,
  orderFiltersToQuery,
  parseOrderFilters,
  type OrderFilters,
} from "@/lib/admin/order-filters";
import { listAdminOrders, listOrderGameOptions, type AdminOrderRow } from "@/lib/admin/orders";
import { storeDateKey } from "@/lib/admin/time";
import { requireAdmin } from "@/lib/auth";
import { formatNumber, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const href = (filters: OrderFilters, page = 1) => {
  const qs = orderFiltersToQuery(filters, page);
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
};

const columns: Column<AdminOrderRow>[] = [
  {
    key: "code",
    header: "Order",
    cell: (o) => (
      <Link
        href={`/admin/orders/${o.id}`}
        className="font-mono font-semibold text-fg underline-offset-4 hover:text-primary hover:underline"
      >
        {o.code}
      </Link>
    ),
  },
  {
    key: "date",
    header: "Created",
    cell: (o) => <span className="whitespace-nowrap text-muted">{formatShortDateTime(o.createdAt)}</span>,
  },
  {
    key: "item",
    header: "Game / package",
    cell: (o) => (
      <div className="min-w-0">
        <p className="max-w-56 truncate font-medium text-fg">{o.packageName}</p>
        <p className="max-w-56 truncate text-xs text-muted">{o.gameName}</p>
      </div>
    ),
  },
  {
    key: "player",
    header: "Player",
    cell: (o) => (
      <div className="min-w-0">
        <p className="font-mono text-fg">
          {o.playerId}
          {o.zoneId && <span className="text-muted"> ({o.zoneId})</span>}
        </p>
        {o.playerName && <p className="max-w-40 truncate text-xs text-muted">{o.playerName}</p>}
      </div>
    ),
  },
  {
    key: "total",
    header: "Total",
    className: "text-right",
    cell: (o) => (
      <div className="tabular-nums">
        <p className="font-semibold text-fg">{formatUsd(o.totalCents)}</p>
        {o.promoCode && <p className="text-xs text-muted">{o.promoCode}</p>}
      </div>
    ),
  },
  { key: "channel", header: "Channel", cell: (o) => <ChannelBadge channel={o.channel} /> },
  { key: "status", header: "Status", cell: (o) => <OrderStatusBadge status={o.status} /> },
];

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  await requireAdmin();
  const { page, ...filters } = parseOrderFilters(await props.searchParams);
  const [result, games] = await Promise.all([listAdminOrders(filters, page), listOrderGameOptions()]);
  const exportQuery = orderFiltersToQuery(filters);
  const today = storeDateKey(new Date());
  const filtered = countActiveFilters(filters) > 0;

  const presets = [
    { label: "Needs action", filters: { ...EMPTY_FILTERS, statuses: [...NEEDS_ACTION_STATUSES] } },
    { label: "Awaiting payment", filters: { ...EMPTY_FILTERS, statuses: ["pending_payment" as const] } },
    { label: "Today", filters: { ...EMPTY_FILTERS, from: today, to: today } },
    { label: "Failed", filters: { ...EMPTY_FILTERS, statuses: ["failed" as const] } },
  ];
  const current = href(filters);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Search, filter and export. Times are Phnom Penh time."
        actions={
          <a
            href={`/admin/orders/export${exportQuery ? `?${exportQuery}` : ""}`}
            className={buttonClasses("secondary", "md")}
            download
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </a>
        }
      />

      <nav aria-label="Quick filters" className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {presets.map((p) => {
          const target = href(p.filters);
          const active = target === current;
          return (
            <Link
              key={p.label}
              href={target}
              aria-current={active ? "true" : undefined}
              className={buttonClasses(active ? "primary" : "secondary", "sm", "shrink-0 rounded-full")}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>

      <OrderFiltersForm filters={filters} games={games} />

      <div className="mt-4">
        {result.rows.length === 0 ? (
          <EmptyState icon={Inbox} title={filtered ? "No orders match these filters" : "No orders yet"}>
            {filtered ? (
              <Link href="/admin/orders" className="font-medium text-primary hover:text-fg">
                Clear filters
              </Link>
            ) : (
              "Orders appear here as soon as customers check out."
            )}
          </EmptyState>
        ) : (
          <>
            <DataTable
              className="hidden md:block"
              caption="Orders"
              rows={result.rows}
              columns={columns}
              rowKey={(o) => o.id}
            />
            <ul className="grid grid-cols-1 gap-2.5 md:hidden">
              {result.rows.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="block rounded-[var(--radius-card)] border border-border bg-surface p-3.5 transition-colors hover:border-primary/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-fg">{o.code}</span>
                      <span className="ml-auto">
                        <OrderStatusBadge status={o.status} />
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm text-fg">
                      {o.packageName} <span className="text-muted">· {o.gameName}</span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                      <ChannelIcon channel={o.channel} className="h-3.5 w-3.5" />
                      <span className="sr-only">{channelLabel(o.channel)}</span>
                      <span className="font-mono">
                        {o.playerId}
                        {o.zoneId && ` (${o.zoneId})`}
                      </span>
                      <span>· {formatShortDateTime(o.createdAt)}</span>
                      <span className="ml-auto text-sm font-semibold text-fg tabular-nums">{formatUsd(o.totalCents)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          hrefFor={(p) => href(filters, p)}
          noun={result.total === 1 ? "order" : "orders"}
        />
        {result.total > 0 && (
          <p className="mt-2 text-xs text-muted">
            Export includes all {formatNumber(result.total)} matching orders (up to 10,000), with attribution columns.
          </p>
        )}
      </div>
    </>
  );
}
