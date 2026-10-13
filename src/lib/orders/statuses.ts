/**
 * The order status list, kept dependency-free on purpose: it is imported by
 * the Drizzle schema (pgEnum) *and* by client components (via status.ts and
 * the @/components/ui StatusBadge), so it must not pull drizzle into browser
 * bundles. Add new statuses here, then `npm run db:generate`.
 */
export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "delivered",
  "failed",
  "refunded",
  "expired",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
