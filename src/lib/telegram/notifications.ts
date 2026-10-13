import "server-only";
import type { Order, OrderStatus } from "@/db/schema";
import { siteUrl } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { adminChatIds, isTelegramConfigured, sendMessage } from "./api";
import {
  alertRefsFrom,
  latestStatusEvent,
  loadOrderEvents,
  sendAdminOrderAlert,
  syncAdminAlerts,
} from "./alerts";
import {
  adminActionFooter,
  buildBakongHealthAlert,
  buildCustomerUpdate,
  type BakongHealthAlert,
  type CustomerContext,
  type CustomerUpdateKind,
} from "./format";

/**
 * Telegram side of src/lib/notify: admin alerts and customer status pushes.
 * Called after a status change is committed; every function swallows and
 * logs its own errors (a Telegram outage must never break checkout).
 */

async function settle(label: string, tasks: (Promise<unknown> | null | undefined)[]): Promise<void> {
  const results = await Promise.allSettled(tasks.filter(Boolean) as Promise<unknown>[]);
  for (const r of results) if (r.status === "rejected") console.error(`[telegram] ${label} failed`, r.reason);
}

export async function customerContext(): Promise<CustomerContext> {
  return { siteUrl: siteUrl(), settings: await getSettings() };
}

/**
 * Which customer message a status change deserves. paid → processing is
 * skipped: it happens seconds after "paid" and the paid message already says
 * we're delivering. A retry (failed → processing) is worth telling.
 */
export function customerUpdateFor(status: OrderStatus, previous: OrderStatus): CustomerUpdateKind | null {
  switch (status) {
    case "processing":
      return previous === "failed" ? "processing" : null;
    case "paid":
    case "delivered":
    case "failed":
    case "refunded":
    case "expired":
    case "cancelled":
      return status;
    default:
      return null;
  }
}

async function sendCustomerUpdate(order: Order, kind: CustomerUpdateKind): Promise<void> {
  const chatId = order.customerTelegramChatId;
  if (!chatId) return;
  const msg = buildCustomerUpdate(kind, order, await customerContext());
  // "Blocked by the user" and similar are logged by the client; nothing else to do.
  await sendMessage(chatId, msg.text, { replyMarkup: msg.replyMarkup });
}

/**
 * Payment confirmed: alert every admin chat, tell the customer if they linked
 * Telegram. `previous` (the status it was paid from) flags late payments on
 * expired/cancelled orders in the admin alert.
 */
export async function telegramNotifyOrderPaid(order: Order, previous?: OrderStatus | null): Promise<void> {
  if (!isTelegramConfigured()) return;
  await settle(`paid notification for ${order.code}`, [
    sendAdminOrderAlert(order, "paid", null, { paidFrom: previous }),
    order.customerTelegramChatId ? sendCustomerUpdate(order, "paid") : null,
  ]);
}

/** Statuses after which recorded admin alerts are re-rendered. */
const ADMIN_SYNC_STATUSES: readonly OrderStatus[] = ["delivered", "failed", "refunded"];

/**
 * Keep admin chats in sync with changes made outside Telegram (admin panel,
 * automatic fulfillment): update the recorded alerts, and raise a new alert
 * when the system — not a person — failed an order. Changes made with the
 * Telegram buttons are rendered by the webhook handler itself (it knows who
 * tapped).
 */
async function updateAdminChats(order: Order, previous: OrderStatus): Promise<void> {
  const retry = order.status === "processing" && previous === "failed";
  if (!retry && !ADMIN_SYNC_STATUSES.includes(order.status)) return;
  if (adminChatIds().length === 0) return;

  const events = await loadOrderEvents(order.id);
  const event = latestStatusEvent(events, order.status);
  const actor = event?.actor ?? "system";
  if (actor === "telegram") return;

  const systemFailure = order.status === "failed" && actor === "system";
  const refs = alertRefsFrom(events);
  await Promise.all([
    refs.length
      ? syncAdminAlerts(order, {
          refs,
          events,
          // A retry puts the order back in someone's hands: bring the buttons back.
          actions: retry,
          footer: adminActionFooter({
            status: order.status,
            at: event?.createdAt ?? new Date(),
            actor,
            reason: systemFailure ? event?.message : null,
          }),
        })
      : null,
    systemFailure ? sendAdminOrderAlert(order, "failed", event?.message) : null,
  ]);
}

/** Any status change except "paid" (see notifyOrderStatusChanged). */
export async function telegramNotifyStatusChanged(order: Order, previous: OrderStatus): Promise<void> {
  if (!isTelegramConfigured()) return;
  const kind = customerUpdateFor(order.status, previous);
  await settle(`status notification for ${order.code} (${previous} → ${order.status})`, [
    kind && kind !== "paid" && order.customerTelegramChatId ? sendCustomerUpdate(order, kind) : null,
    updateAdminChats(order, previous),
  ]);
}

/** Bakong checks failing / recovered: message every admin chat (no-op without a bot or admin chats). */
export async function telegramNotifyPaymentHealth(alert: BakongHealthAlert): Promise<void> {
  if (!isTelegramConfigured()) return;
  const chats = adminChatIds();
  if (chats.length === 0) return;
  const msg = buildBakongHealthAlert(alert, { siteUrl: siteUrl() });
  await settle(
    `payment health alert (${alert.kind})`,
    chats.map((chatId) => sendMessage(chatId, msg.text, { replyMarkup: msg.replyMarkup })),
  );
}
