import "server-only";
import type { Order, OrderEvent, OrderStatus } from "@/db/schema";
import { env } from "@/lib/env";

/**
 * Customer-safe view of an order, returned by the public API and rendered on
 * /orders/[code]. Anyone holding the order code can see this, so it must
 * never include admin notes, IP hash, user agent, contact details,
 * attribution or raw payment payloads.
 */
export type PublicOrder = {
  code: string;
  status: OrderStatus;
  gameSlug: string;
  gameName: string;
  packageName: string;
  playerId: string;
  zoneId: string | null;
  playerName: string | null;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
  currency: "USD";
  promoCode: string | null;
  /** Only while pending_payment. */
  khqr: string | null;
  /** ISO */
  paymentExpiresAt: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  paymentMode: "mock" | "bakong";
  /** t.me deep link to get updates, when the bot is configured. */
  telegramLink: string | null;
  telegramLinked: boolean;
  /** Customer-safe events (no admin notes). */
  timeline: { type: string; at: string }[];
};

/** Event types customers may see on their timeline. */
export const PUBLIC_EVENT_TYPES = [
  "created",
  "paid",
  "processing",
  "delivered",
  "failed",
  "refunded",
  "expired",
  "cancelled",
] as const;

const PUBLIC_EVENTS = new Set<string>(PUBLIC_EVENT_TYPES);

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Deep link that opens the bot and links this order (/start ord_<code>), or null when no bot is set. */
export function telegramOrderLink(code: string): string | null {
  const username = env().TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!username || !/^\w{3,64}$/.test(username)) return null;
  return `https://t.me/${username}?start=ord_${code}`;
}

/** Fallback timeline from the order's own timestamps when events weren't loaded. */
function timelineFromOrder(order: Order): PublicOrder["timeline"] {
  const out: PublicOrder["timeline"] = [{ type: "created", at: order.createdAt.toISOString() }];
  if (order.paidAt) out.push({ type: "paid", at: order.paidAt.toISOString() });
  if (order.deliveredAt) out.push({ type: "delivered", at: order.deliveredAt.toISOString() });
  return out;
}

export function toPublicOrder(order: Order, events?: OrderEvent[]): PublicOrder {
  const timeline = events
    ? events
        .filter((e) => PUBLIC_EVENTS.has(e.type))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
        .map((e) => ({ type: e.type, at: e.createdAt.toISOString() }))
    : timelineFromOrder(order);

  return {
    code: order.code,
    status: order.status,
    gameSlug: order.gameSlug,
    gameName: order.gameName,
    packageName: order.packageName,
    playerId: order.playerId,
    zoneId: order.zoneId,
    playerName: order.playerName,
    unitPriceCents: order.unitPriceCents,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    currency: "USD",
    promoCode: order.promoCode,
    khqr: order.status === "pending_payment" ? order.khqr : null,
    paymentExpiresAt: iso(order.paymentExpiresAt),
    paidAt: iso(order.paidAt),
    deliveredAt: iso(order.deliveredAt),
    createdAt: order.createdAt.toISOString(),
    paymentMode: env().PAYMENT_MODE,
    telegramLink: telegramOrderLink(order.code),
    telegramLinked: !!order.customerTelegramChatId,
    timeline,
  };
}
