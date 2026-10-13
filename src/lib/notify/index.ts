import "server-only";
import type { Order, OrderStatus } from "@/db/schema";
import { telegramNotifyOrderPaid, telegramNotifyStatusChanged } from "@/lib/telegram/notifications";

/**
 * Notification hooks called by the order service (src/lib/orders/service.ts)
 * AFTER a status change has been committed. They never throw (errors are
 * logged) — a failed Telegram message must not break checkout.
 *
 * Implemented with Telegram (src/lib/telegram/*); each is a no-op when
 * TELEGRAM_BOT_TOKEN is unset.
 */

/**
 * Order just became `paid` (payment confirmed): alert every chat in
 * TELEGRAM_ADMIN_CHAT_IDS with ✅/❌ buttons, and message the customer if
 * they linked their Telegram chat.
 */
export async function notifyOrderPaid(order: Order): Promise<void> {
  try {
    await telegramNotifyOrderPaid(order);
  } catch (err) {
    console.error(`[notify] paid notification failed for ${order.code}`, err);
  }
}

/**
 * Any other status change (processing, delivered, failed, refunded, expired,
 * cancelled). Pushes an update to the customer's Telegram chat if linked,
 * keeps admin alert messages in sync, and alerts admins when the system
 * failed an order.
 */
export async function notifyOrderStatusChanged(order: Order, previous: OrderStatus): Promise<void> {
  try {
    await telegramNotifyStatusChanged(order, previous);
  } catch (err) {
    console.error(`[notify] status notification failed for ${order.code}`, err);
  }
}
