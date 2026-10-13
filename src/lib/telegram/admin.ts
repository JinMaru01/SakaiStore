import "server-only";
import type { Order } from "@/db/schema";
import { getChannelStats, getDashboardKpis, getNeedsDelivery, countOrdersNeedingAction } from "@/lib/admin/stats";
import { addDays, startOfStoreDay } from "@/lib/admin/time";
import { siteUrl } from "@/lib/env";
import { getOrderByCode, getOrderById, markOrderDelivered, markOrderFailed } from "@/lib/orders/service";
import { answerCallbackQuery, sendMessage } from "./api";
import { alertRefsFrom, findRef, latestStatusEvent, loadOrderEvents, paidFromEvents, syncAdminAlerts } from "./alerts";
import type { OrderCallback } from "./callbacks";
import {
  adminActionFooter,
  alreadyText,
  buildAdminOrderCard,
  buildAdminQueue,
  buildAdminStats,
  escapeHtml,
  type BotMessage,
} from "./format";
import type { IncomingCallbackQuery, IncomingUser } from "./webhook";

/**
 * Admin control room: /orders, /order <code>, /stats and the ✅/❌ buttons.
 * Callers (./bot.ts) have already checked the chat/user is an admin.
 */

const QUEUE_LIMIT = 15;

async function reply(chatId: number | string, msg: BotMessage | string): Promise<void> {
  const m = typeof msg === "string" ? { text: msg } : msg;
  await sendMessage(chatId, m.text, { replyMarkup: m.replyMarkup });
}

/** First name for footers and the audit trail ("Sokha", else "@user", else the id). */
function displayName(user: IncomingUser): string {
  return user.first_name.trim() || (user.username ? `@${user.username}` : `user ${user.id}`);
}

/** "Sokha (@sokha, 12345)" — who did it, for the order timeline. */
function auditName(user: IncomingUser): string {
  return `${displayName(user)} (${user.username ? `@${user.username}, ` : ""}id ${user.id})`;
}

export async function handleOrdersCommand(chatId: number): Promise<void> {
  const [items, total] = await Promise.all([getNeedsDelivery(QUEUE_LIMIT), countOrdersNeedingAction()]);
  await reply(chatId, buildAdminQueue(items, total, { siteUrl: siteUrl() }));
}

export async function handleOrderCommand(chatId: number, args: string): Promise<void> {
  const code = args.split(/\s+/)[0];
  if (!code) {
    await reply(chatId, "Send an order code, e.g. <code>/order SK7F3K9Q2M</code>");
    return;
  }
  const order = await getOrderByCode(code);
  if (!order) {
    await reply(chatId, `Order <code>${escapeHtml(code.slice(0, 32))}</code> not found.`);
    return;
  }
  await reply(chatId, await detailsCard(order));
}

/** The /order card, with the late-payment warning when it was paid after expiring/cancelling. */
async function detailsCard(order: Order) {
  const paidFrom = order.paidAt ? paidFromEvents(await loadOrderEvents(order.id)) : undefined;
  return buildAdminOrderCard(order, { kind: "details", siteUrl: siteUrl(), actions: true, paidFrom });
}

export async function handleStatsCommand(chatId: number): Promise<void> {
  const now = new Date();
  const today = startOfStoreDay(now);
  const [kpis, channels] = await Promise.all([
    getDashboardKpis(now),
    getChannelStats({ from: today, to: addDays(today, 1) }),
  ]);
  await reply(
    chatId,
    buildAdminStats({
      now,
      paidOrdersToday: kpis.paidOrdersToday,
      revenueTodayCents: kpis.revenueTodayCents,
      awaitingDelivery: kpis.awaitingDelivery,
      failed: kpis.failed,
      revenue7dCents: kpis.revenue7dCents,
      channels,
    }),
  );
}

/** Re-render a tapped card that is out of date (double tap, another admin, admin panel). */
async function refreshTappedCard(order: Order, tapped: { chatId: string; messageId: number }): Promise<void> {
  const events = await loadOrderEvents(order.id);
  const ref = findRef(alertRefsFrom(events), tapped.chatId, tapped.messageId);
  const actionable = order.status === "paid" || order.status === "processing";
  const event = actionable ? null : latestStatusEvent(events, order.status);
  await syncAdminAlerts(order, {
    refs: [ref ?? { ...tapped, kind: "details", reason: null }],
    events,
    actions: actionable,
    footer: event ? adminActionFooter({ status: order.status, at: event.createdAt, actor: event.actor }) : null,
  });
}

/**
 * ✅ / ❌ / view buttons. The order service makes the transition idempotent:
 * of two admins tapping ✅ at once, exactly one wins; the other is told
 * "Already delivered".
 */
export async function handleOrderCallback(cq: IncomingCallbackQuery, cb: OrderCallback): Promise<void> {
  const order = await getOrderByCode(cb.code);
  if (!order) {
    await answerCallbackQuery(cq.id, { text: "Order not found", showAlert: true });
    return;
  }
  const chatId = cq.message?.chat.id ?? cq.from.id;

  if (cb.action === "view") {
    await Promise.all([answerCallbackQuery(cq.id), reply(chatId, await detailsCard(order))]);
    return;
  }

  const tapped = cq.message ? { chatId: String(cq.message.chat.id), messageId: cq.message.message_id } : null;
  const updated =
    cb.action === "dlv"
      ? await markOrderDelivered(order.id, { actor: "telegram", message: `Marked delivered in Telegram by ${auditName(cq.from)}` })
      : await markOrderFailed(order.id, { actor: "telegram", reason: `Marked failed in Telegram by ${auditName(cq.from)}` });

  if (updated) {
    await Promise.all([
      answerCallbackQuery(cq.id, {
        text: updated.status === "delivered" ? `✅ ${order.code} marked delivered` : `❌ ${order.code} marked failed`,
      }),
      // Every admin's copy (and the tapped card) shows who did it; the buttons go away.
      syncAdminAlerts(updated, {
        actions: false,
        extra: tapped,
        footer: adminActionFooter({ status: updated.status, at: new Date(), by: displayName(cq.from) }),
      }),
    ]);
    return;
  }

  const current = (await getOrderById(order.id)) ?? order;
  await Promise.all([
    answerCallbackQuery(cq.id, { text: alreadyText(current.status) }),
    tapped ? refreshTappedCard(current, tapped) : null,
  ]);
}
