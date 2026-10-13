import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChannelBadge, OrderStatusBadge } from "@/components/admin/badges";
import { CopyButton } from "@/components/admin/copy-button";
import { DetailList, DetailRow } from "@/components/admin/detail-list";
import { OrderActionsPanel, OrderNoteForm } from "@/components/admin/order-actions";
import { PageHeader } from "@/components/admin/page-header";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { OrderEvent } from "@/db/schema";
import { formatDateTime } from "@/lib/admin/format";
import { requireAdmin } from "@/lib/auth";
import { getOrderById, listOrderEvents } from "@/lib/orders/service";
import { cn, formatUsd } from "@/lib/utils";
import { orderAction } from "../actions";

export const metadata: Metadata = { title: "Order" };

const EVENT_LABELS: Record<string, string> = {
  created: "Order created",
  paid: "Payment received",
  processing: "Processing",
  delivered: "Delivered",
  failed: "Failed",
  refunded: "Refunded",
  expired: "Expired",
  cancelled: "Cancelled",
  note: "Internal note",
  notify: "Notification",
};

const EVENT_DOT: Record<string, string> = {
  paid: "bg-info",
  processing: "bg-info",
  delivered: "bg-success",
  failed: "bg-danger",
  note: "bg-warning",
};

const TELEGRAM_USERNAME = /^[A-Za-z0-9_]{3,64}$/;

function payloadPreview(payload: unknown): string | null {
  if (payload == null) return null;
  try {
    const text = JSON.stringify(payload, null, 2);
    return text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text;
  } catch {
    return null;
  }
}

function Timeline({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">No events recorded.</p>;
  return (
    <ol className="relative grid grid-cols-1 gap-4 border-l border-border pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-surface",
              EVENT_DOT[e.type] ?? "bg-muted",
            )}
          />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-fg">{EVENT_LABELS[e.type] ?? e.type}</span>
            <Badge className="px-2 py-0 text-[11px] capitalize">{e.actor}</Badge>
            <time dateTime={e.createdAt.toISOString()} className="text-xs text-muted">
              {formatDateTime(e.createdAt)}
            </time>
          </div>
          {e.message && (
            <p
              className={cn(
                "mt-1 text-sm break-words whitespace-pre-line",
                e.type === "note" ? "rounded-lg bg-warning/10 px-3 py-2 text-fg" : "text-muted",
              )}
            >
              {e.message}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export default async function OrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const order = await getOrderById(id);
  if (!order) notFound();
  const events = await listOrderEvents(order.id);

  const telegram = order.contactTelegram?.replace(/^@/, "") ?? null;
  const payload = payloadPreview(order.paymentPayload);
  const idWithZone = order.zoneId ? `${order.playerId} (${order.zoneId})` : order.playerId;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{order.code}</span>
            <CopyButton value={order.code} label="order code" />
            <OrderStatusBadge status={order.status} />
          </span>
        }
        description={`Created ${formatDateTime(order.createdAt)} · ${formatUsd(order.totalCents)}`}
      />

      <Card className="mb-4">
        <CardHeader className="pb-3 sm:pb-3">
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderActionsPanel
            orderId={order.id}
            status={order.status}
            action={orderAction}
            totalLabel={formatUsd(order.totalCents)}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-1 min-w-0 content-start gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Top-up details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList>
                <DetailRow label="Game">{order.gameName}</DetailRow>
                <DetailRow label="Package">
                  <span className="font-semibold">{order.packageName}</span>
                </DetailRow>
                <DetailRow label="Player ID">
                  <CopyButton value={order.playerId} label="player ID" showValue />
                </DetailRow>
                {order.zoneId && (
                  <DetailRow label="Zone / server">
                    <span className="flex flex-wrap items-center gap-2">
                      <CopyButton value={order.zoneId} label="zone ID" showValue />
                      <CopyButton value={idWithZone} label="ID with zone" showValue />
                    </span>
                  </DetailRow>
                )}
                <DetailRow label="Player name">
                  {order.playerName ? <CopyButton value={order.playerName} label="player name" showValue /> : null}
                </DetailRow>
              </DetailList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList>
                <DetailRow label="Price">{formatUsd(order.unitPriceCents)}</DetailRow>
                <DetailRow label="Discount">
                  {order.discountCents > 0 ? (
                    <>
                      −{formatUsd(order.discountCents)}
                      {order.promoCode && <span className="text-muted"> · code {order.promoCode}</span>}
                    </>
                  ) : null}
                </DetailRow>
                <DetailRow label="Total">
                  <span className="font-semibold">
                    {formatUsd(order.totalCents)} {order.currency}
                  </span>
                </DetailRow>
                <DetailRow label="Method">{order.paymentMethod.toUpperCase()}</DetailRow>
                <DetailRow label="Payment ref" mono>
                  {order.paymentRef ? <CopyButton value={order.paymentRef} label="payment reference" showValue /> : null}
                </DetailRow>
                <DetailRow label="KHQR md5" mono>
                  {order.khqrMd5 ? <CopyButton value={order.khqrMd5} label="KHQR md5" showValue /> : null}
                </DetailRow>
                <DetailRow label="Pay before">{order.paymentExpiresAt ? formatDateTime(order.paymentExpiresAt) : null}</DetailRow>
                <DetailRow label="Last bank check">
                  {order.lastPaymentCheckAt ? formatDateTime(order.lastPaymentCheckAt) : null}
                </DetailRow>
                <DetailRow label="Paid at">{order.paidAt ? formatDateTime(order.paidAt) : null}</DetailRow>
                <DetailRow label="Delivered at">{order.deliveredAt ? formatDateTime(order.deliveredAt) : null}</DetailRow>
                <DetailRow label="Updated">{formatDateTime(order.updatedAt)}</DetailRow>
              </DetailList>
              {payload && (
                <details className="mt-3 rounded-xl border border-border bg-surface-2/50">
                  <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-medium">Raw payment confirmation</summary>
                  <pre className="max-h-72 overflow-auto border-t border-border px-3.5 py-3 font-mono text-xs break-all whitespace-pre-wrap text-muted">
                    {payload}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5">
              <Timeline events={events} />
              <OrderNoteForm orderId={order.id} action={orderAction} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 min-w-0 content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList>
                <DetailRow label="Phone">
                  {order.contactPhone ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <a
                        href={`tel:${order.contactPhone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-fg"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {order.contactPhone}
                      </a>
                      <CopyButton value={order.contactPhone} label="phone number" />
                    </span>
                  ) : null}
                </DetailRow>
                <DetailRow label="Telegram">
                  {telegram ? (
                    TELEGRAM_USERNAME.test(telegram) ? (
                      <a
                        href={`https://t.me/${telegram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:text-fg"
                      >
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />@{telegram}
                      </a>
                    ) : (
                      telegram
                    )
                  ) : null}
                </DetailRow>
                <DetailRow label="Bot updates">
                  {order.customerTelegramChatId ? (
                    <span className="text-success">Linked — gets status messages</span>
                  ) : (
                    <span className="text-muted">Not linked</span>
                  )}
                </DetailRow>
                <DetailRow label="Language">{order.locale === "km" ? "Khmer" : "English"}</DetailRow>
                {order.customerNote && <DetailRow label="Customer note">{order.customerNote}</DetailRow>}
                {order.adminNote && <DetailRow label="Admin note">{order.adminNote}</DetailRow>}
              </DetailList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList>
                <DetailRow label="Channel">
                  <ChannelBadge channel={order.channel} />
                </DetailRow>
                <DetailRow label="utm_source">{order.utmSource}</DetailRow>
                <DetailRow label="utm_medium">{order.utmMedium}</DetailRow>
                <DetailRow label="utm_campaign">{order.utmCampaign}</DetailRow>
                <DetailRow label="utm_content">{order.utmContent}</DetailRow>
                <DetailRow label="utm_term">{order.utmTerm}</DetailRow>
                <DetailRow label="Click ID" mono>
                  {order.clickId ? <span className="text-xs break-all">{order.clickId}</span> : null}
                </DetailRow>
                <DetailRow label="Referrer">
                  {order.referrer ? <span className="break-all">{order.referrer}</span> : null}
                </DetailRow>
                <DetailRow label="Landing page">
                  {order.landingPath ? <span className="break-all">{order.landingPath}</span> : null}
                </DetailRow>
              </DetailList>
            </CardContent>
          </Card>

          <details className="rounded-[var(--radius-card)] border border-border bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium sm:px-5">Technical</summary>
            <div className="border-t border-border px-4 pb-3 sm:px-5">
              <DetailList>
                <DetailRow label="Order ID" mono>
                  <span className="text-xs break-all">{order.id}</span>
                </DetailRow>
                <DetailRow label="IP hash" mono>
                  {order.ipHash ? <span className="text-xs break-all">{order.ipHash}</span> : null}
                </DetailRow>
                <DetailRow label="User agent">
                  {order.userAgent ? <span className="text-xs break-all">{order.userAgent}</span> : null}
                </DetailRow>
              </DetailList>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
