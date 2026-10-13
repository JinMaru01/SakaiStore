import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ORDER_STATUSES, orderEvents, type Order, type OrderEvent, type OrderStatus } from "@/db/schema";
import { siteUrl } from "@/lib/env";
import { adminChatIds, editMessageText, isTelegramConfigured, sendMessage } from "./api";
import { buildAdminOrderCard, type AdminCardKind } from "./format";

/**
 * Admin order alerts in Telegram.
 *
 * When an alert is sent we store where each copy landed (chat id + message
 * id) in a `notify` order event. Later status changes — a ✅ tap by another
 * admin, the admin panel, automatic fulfillment — re-render every copy so no
 * admin is left with live ✅/❌ buttons on an order someone else already
 * handled (that is how double top-ups happen).
 *
 * This module deliberately reads order_events with its own query instead of
 * importing the order service: the service imports notify → telegram, and a
 * cycle back into it is easy to break by accident.
 */

export type AlertKind = "paid" | "failed";

/** A Telegram message that shows an order card. */
export type CardRef = { chatId: string; messageId: number; kind: AdminCardKind; reason: string | null };

const alertDataSchema = z.object({
  telegramAlert: z.object({
    kind: z.enum(["paid", "failed"]),
    reason: z.string().nullish(),
    messages: z.array(z.object({ chatId: z.string(), messageId: z.number().int() })),
  }),
});

const paidEventDataSchema = z.object({ previous: z.enum(ORDER_STATUSES) });

type EventRow = Pick<OrderEvent, "type" | "actor" | "message" | "data" | "createdAt">;

/** All events of an order, oldest first (one small query; orders have a handful of events). */
export async function loadOrderEvents(orderId: string): Promise<EventRow[]> {
  return db
    .select({
      type: orderEvents.type,
      actor: orderEvents.actor,
      message: orderEvents.message,
      data: orderEvents.data,
      createdAt: orderEvents.createdAt,
    })
    .from(orderEvents)
    .where(eq(orderEvents.orderId, orderId))
    .orderBy(asc(orderEvents.createdAt), asc(orderEvents.id));
}

/** Alert copies recorded for an order. */
export function alertRefsFrom(events: EventRow[]): CardRef[] {
  const refs: CardRef[] = [];
  for (const e of events) {
    if (e.type !== "notify") continue;
    const parsed = alertDataSchema.safeParse(e.data);
    if (!parsed.success) continue;
    const { kind, reason, messages } = parsed.data.telegramAlert;
    for (const m of messages) refs.push({ chatId: m.chatId, messageId: m.messageId, kind, reason: reason ?? null });
  }
  return refs;
}

/** The event that moved the order into `status` most recently (who did it, when, why). */
export function latestStatusEvent(events: EventRow[], status: OrderStatus): EventRow | null {
  for (let i = events.length - 1; i >= 0; i--) if (events[i]!.type === status) return events[i]!;
  return null;
}

export function findRef(refs: CardRef[], chatId: string, messageId: number): CardRef | undefined {
  return refs.find((r) => r.chatId === chatId && r.messageId === messageId);
}

/**
 * The status the order was paid from (pending_payment, or expired/cancelled
 * for a late payment), as recorded by markOrderPaid on the "paid" event.
 * Undefined when the order is unpaid or the event predates that field.
 */
export function paidFromEvents(events: EventRow[]): OrderStatus | undefined {
  const paid = latestStatusEvent(events, "paid");
  const parsed = paidEventDataSchema.safeParse(paid?.data);
  return parsed.success ? parsed.data.previous : undefined;
}

/**
 * Send an order alert with ✅/❌ buttons to every admin chat and remember
 * where it landed. `paidFrom` (paid alerts) adds the late-payment warning.
 * Returns the delivered copies. Never throws.
 */
export async function sendAdminOrderAlert(
  order: Order,
  kind: AlertKind,
  reason?: string | null,
  opts: { paidFrom?: OrderStatus | null } = {},
): Promise<CardRef[]> {
  const chats = adminChatIds();
  if (!isTelegramConfigured() || chats.length === 0) return [];
  const card = buildAdminOrderCard(order, { kind, reason, siteUrl: siteUrl(), actions: true, paidFrom: opts.paidFrom });
  const results = await Promise.all(
    chats.map(async (chatId) => ({ chatId, res: await sendMessage(chatId, card.text, { replyMarkup: card.replyMarkup }) })),
  );
  const messages = results.flatMap(({ chatId, res }) => (res.ok ? [{ chatId, messageId: res.result.message_id }] : []));

  const what = kind === "paid" ? "Paid-order alert" : "Failure alert";
  try {
    await db.insert(orderEvents).values({
      orderId: order.id,
      type: "notify",
      actor: "system",
      message: messages.length
        ? `${what} sent to ${messages.length} of ${chats.length} Telegram admin chat(s)`
        : `${what} could not be delivered to any Telegram admin chat`,
      data: { telegramAlert: { kind, reason: reason ?? null, messages } },
    });
  } catch (err) {
    console.error(`[telegram] could not record alert for ${order.code}`, err);
  }
  return messages.map((m) => ({ ...m, kind, reason: reason ?? null }));
}

/**
 * Re-render every recorded alert copy (plus `extra`, e.g. the /order card an
 * admin tapped) with the order's current state and `footer`. `actions`
 * decides whether ✅/❌ stay. Pass `events` when already loaded (refs and the
 * late-payment warning come from them). Never throws.
 */
export async function syncAdminAlerts(
  order: Order,
  opts: {
    footer: string | null;
    actions: boolean;
    refs?: CardRef[];
    events?: EventRow[];
    extra?: { chatId: string; messageId: number } | null;
  },
): Promise<void> {
  try {
    const events = opts.events ?? (await loadOrderEvents(order.id));
    const refs = opts.refs ?? alertRefsFrom(events);
    const paidFrom = paidFromEvents(events);
    const targets = [...refs];
    if (opts.extra && !findRef(refs, opts.extra.chatId, opts.extra.messageId)) {
      targets.push({ ...opts.extra, kind: "details", reason: null });
    }
    const site = siteUrl();
    await Promise.all(
      targets.map((t) => {
        const card = buildAdminOrderCard(order, {
          kind: t.kind,
          reason: t.reason,
          siteUrl: site,
          actions: opts.actions,
          footer: opts.footer,
          paidFrom,
        });
        return editMessageText(t.chatId, t.messageId, card.text, { replyMarkup: card.replyMarkup ?? null });
      }),
    );
  } catch (err) {
    console.error(`[telegram] could not update admin alerts for ${order.code}`, err);
  }
}

