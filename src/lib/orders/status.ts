// From the dependency-free list (not @/db/schema) so client bundles stay free of drizzle.
import type { OrderStatus } from "./statuses";
export { ORDER_STATUSES } from "./statuses";
export type { OrderStatus } from "./statuses";

/**
 * Allowed order status transitions (from -> to). Every status change MUST go
 * through a conditional UPDATE that checks the current status is one of the
 * allowed "from" states, so concurrent payment checks / admin clicks cannot
 * double-apply side effects (see src/lib/orders/service.ts).
 *
 *   pending_payment ──paid──▶ paid ──▶ processing ──▶ delivered
 *        │                     ▲ │           │
 *        ├─▶ expired ──────────┤ └──────────▶├─▶ failed ──▶ processing (retry)
 *        └─▶ cancelled ────────┘              │           └─▶ refunded
 *            (late payment)                   └─▶ refunded
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "expired", "cancelled"],
  // A late payment is still money received. Expired: the payment was confirmed
  // after the window closed. Cancelled: the customer had already opened (or
  // saved) the KHQR, which stays payable until it expires. Both only ever move
  // on to "paid".
  expired: ["paid"],
  cancelled: ["paid"],
  paid: ["processing", "delivered", "failed", "refunded"],
  processing: ["delivered", "failed", "refunded"],
  failed: ["processing", "delivered", "refunded"],
  delivered: ["refunded"],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Statuses from which `to` is reachable. */
export function allowedFrom(to: OrderStatus): OrderStatus[] {
  return (Object.keys(ORDER_TRANSITIONS) as OrderStatus[]).filter((from) =>
    ORDER_TRANSITIONS[from].includes(to),
  );
}

/** Customer has paid (money received), regardless of delivery state. */
export const PAID_STATUSES: readonly OrderStatus[] = ["paid", "processing", "delivered", "failed", "refunded"];
/** Statuses that count as revenue in analytics. */
export const REVENUE_STATUSES: readonly OrderStatus[] = ["paid", "processing", "delivered"];
/**
 * The order is closed for the customer. Expired and cancelled orders can still
 * become "paid" if a late payment is found (see ORDER_TRANSITIONS).
 */
export const FINAL_STATUSES: readonly OrderStatus[] = ["delivered", "refunded", "cancelled", "expired"];
/** Unpaid orders whose KHQR may still have been paid: reconcile keeps checking them for a while. */
export const LATE_PAYMENT_STATUSES: readonly OrderStatus[] = ["expired", "cancelled"];

export function isPaidStatus(s: OrderStatus) {
  return PAID_STATUSES.includes(s);
}

/** Tailwind classes for status badges (shared by storefront + admin). */
export const STATUS_STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-warning/15 text-warning ring-warning/30",
  paid: "bg-info/15 text-info ring-info/30",
  processing: "bg-info/15 text-info ring-info/30",
  delivered: "bg-success/15 text-success ring-success/30",
  failed: "bg-danger/15 text-danger ring-danger/30",
  refunded: "bg-muted/15 text-muted ring-muted/30",
  expired: "bg-muted/15 text-muted ring-muted/30",
  cancelled: "bg-muted/15 text-muted ring-muted/30",
};

/** English labels (admin + fallback). Customer UI uses i18n keys `order.status.<status>`. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  delivered: "Delivered",
  failed: "Failed",
  refunded: "Refunded",
  expired: "Expired",
  cancelled: "Cancelled",
};
