import { canTransition, type OrderStatus } from "@/lib/orders/status";

/**
 * Which admin buttons make sense for an order in `status` — derived from the
 * state machine so the UI never offers a transition the service would refuse.
 * Pure; safe for server and client.
 */
export type OrderActionAvailability = {
  deliver: boolean;
  fail: boolean;
  /** paid → processing ("Start processing") or failed → processing ("Retry"). */
  process: boolean;
  refund: boolean;
  cancel: boolean;
  markPaid: boolean;
};

export function availableOrderActions(status: OrderStatus): OrderActionAvailability {
  return {
    deliver: canTransition(status, "delivered"),
    fail: canTransition(status, "failed"),
    process: canTransition(status, "processing"),
    refund: canTransition(status, "refunded"),
    cancel: canTransition(status, "cancelled"),
    markPaid: canTransition(status, "paid"),
  };
}
