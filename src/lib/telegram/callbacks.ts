/**
 * Inline-button callback data for order actions (≤ 64 bytes, Telegram's limit):
 *   ord:dlv:<code>   ✅ mark delivered
 *   ord:fail:<code>  ❌ mark failed
 *   ord:view:<code>  show the order card (from the /orders queue)
 * Only admin chats may trigger them (checked by the webhook handler).
 */

export const ORDER_CALLBACK_ACTIONS = ["dlv", "fail", "view"] as const;
export type OrderCallbackAction = (typeof ORDER_CALLBACK_ACTIONS)[number];

export type OrderCallback = { action: OrderCallbackAction; code: string };

const CALLBACK_RE = /^ord:(dlv|fail|view):([A-Z0-9]{4,16})$/;

export function orderCallbackData(action: OrderCallbackAction, code: string): string {
  return `ord:${action}:${code}`;
}

/** Parse callback data; null for anything we didn't create. */
export function parseOrderCallback(data: string | null | undefined): OrderCallback | null {
  const m = typeof data === "string" ? CALLBACK_RE.exec(data) : null;
  return m ? { action: m[1] as OrderCallbackAction, code: m[2]! } : null;
}
