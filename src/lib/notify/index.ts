import "server-only";
import type { Order, OrderStatus } from "@/db/schema";

/**
 * Notification hooks called by the order service (src/lib/orders/service.ts)
 * AFTER a status change has been committed. Implementations must never throw
 * (log instead) — a failed Telegram message must not break checkout.
 *
 * Implemented by the Telegram integration (src/lib/telegram/*).
 */

/** Order just became `paid` (payment confirmed). Alert admins. */
export async function notifyOrderPaid(order: Order): Promise<void> {
  console.info(`[notify] order ${order.code} paid (${order.totalCents}c)`);
}

/**
 * Any other status change (processing, delivered, failed, refunded, expired,
 * cancelled). Push an update to the customer's Telegram chat if linked, and
 * keep admin messages in sync.
 */
export async function notifyOrderStatusChanged(
  order: Order,
  previous: OrderStatus,
): Promise<void> {
  console.info(`[notify] order ${order.code}: ${previous} -> ${order.status}`);
}
