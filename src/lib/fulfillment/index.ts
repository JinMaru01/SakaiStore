import "server-only";
import type { Order } from "@/db/schema";
import { env } from "@/lib/env";
import { getOrderById, markOrderDelivered, markOrderProcessing } from "@/lib/orders/service";

/**
 * Fulfillment starts right after an order is paid (called by markOrderPaid).
 *
 * FULFILLMENT_MODE:
 *  - manual: paid → processing. The admin tops up the player in-game, then
 *            clicks ✅ Delivered in Telegram or /admin (→ markOrderDelivered).
 *  - mock:   paid → processing → delivered immediately (demos / e2e tests).
 *
 * A supplier API integration would slot in as another mode using
 * packages.supplierSku. Never throws: payment is already confirmed, so a
 * fulfillment hiccup must not turn into an error page for the customer.
 * Returns the latest order state.
 */
export async function startFulfillment(order: Order): Promise<Order> {
  try {
    const mode = env().FULFILLMENT_MODE;
    const processing = await markOrderProcessing(order.id, {
      actor: "system",
      message: mode === "manual" ? "Waiting for admin to deliver" : "Auto-delivery started",
    });
    if (!processing) {
      // Someone else (admin click, retry) already moved it on; report what's there now.
      return (await getOrderById(order.id)) ?? order;
    }
    if (mode === "mock") {
      const delivered = await markOrderDelivered(order.id, {
        actor: "system",
        message: "Delivered automatically (mock fulfillment)",
      });
      return delivered ?? processing;
    }
    return processing;
  } catch (err) {
    console.error(`[fulfillment] failed to start fulfillment for ${order.code}`, err);
    return order;
  }
}
