import "server-only";
import type { Order } from "@/db/schema";
import { env } from "@/lib/env";
import { checkTransactionByMd5 } from "./bakong";
import { buildKhqr } from "./khqr";

/**
 * Payment provider facade used by the order service. Switches on
 * PAYMENT_MODE:
 *  - mock:   a real, scannable-format KHQR (demo account unless one is set);
 *            payment happens only via POST /api/orders/[code]/simulate-payment.
 *  - bakong: real KHQR + Bakong Open API status check, with the paid
 *            amount/currency/account verified against the order.
 */

export { KhqrError } from "./khqr";

export type PaymentMode = "mock" | "bakong";

export function getPaymentMode(): PaymentMode {
  return env().PAYMENT_MODE;
}

export type PaymentRequest = {
  /** Order code — becomes the KHQR bill number. */
  code: string;
  totalCents: number;
  now?: Date;
};

export type CreatedPayment = { khqr: string; md5: string; expiresAt: Date };

let warnedMockInProd = false;

/** Build the KHQR for a new order. Throws KhqrError when payments are misconfigured. */
export function createPayment({ code, totalCents, now = new Date() }: PaymentRequest): CreatedPayment {
  const e = env();
  if (e.PAYMENT_MODE === "mock" && e.NODE_ENV === "production" && !warnedMockInProd) {
    warnedMockInProd = true;
    console.warn(
      "[payments] PAYMENT_MODE=mock in production: orders can be marked paid without money. Set PAYMENT_MODE=bakong before launch.",
    );
  }
  const expiresAt = new Date(now.getTime() + e.PAYMENT_TIMEOUT_MINUTES * 60_000);
  const { qr, md5 } = buildKhqr({ amountCents: totalCents, billNumber: code, expiresAt });
  return { khqr: qr, md5, expiresAt };
}

export type PaymentCheckResult =
  | { status: "paid"; ref: string | null; payload: unknown }
  | { status: "unpaid" }
  | { status: "error"; message: string };

type CheckableOrder = Pick<Order, "code" | "khqrMd5" | "totalCents" | "currency">;

/**
 * Ask the provider whether the order's KHQR was paid. Never throws. In bakong
 * mode a transaction only counts when it matches the order exactly; anything
 * else is logged loudly and reported as an error for the admin to review.
 */
export async function checkPayment(order: CheckableOrder): Promise<PaymentCheckResult> {
  const e = env();
  // Mock payments are confirmed via the simulate endpoint, never by polling.
  if (e.PAYMENT_MODE === "mock") return { status: "unpaid" };
  if (!order.khqrMd5) return { status: "error", message: "Order has no KHQR md5" };

  const result = await checkTransactionByMd5(order.khqrMd5);
  if (result.status !== "paid") return result;

  const paidCents = Math.round(result.amount * 100);
  if (result.currency !== order.currency.toUpperCase() || paidCents !== order.totalCents) {
    const message = `Payment mismatch for ${order.code}: paid ${result.amount} ${result.currency}, expected ${(
      order.totalCents / 100
    ).toFixed(2)} ${order.currency}`;
    console.error(`[payments] ${message}`);
    return { status: "error", message };
  }
  const expectedAccount = e.BAKONG_ACCOUNT_ID?.trim().toLowerCase();
  if (result.toAccountId && expectedAccount && result.toAccountId.toLowerCase() !== expectedAccount) {
    const message = `Payment for ${order.code} went to ${result.toAccountId}, expected ${e.BAKONG_ACCOUNT_ID}`;
    console.error(`[payments] ${message}`);
    return { status: "error", message };
  }
  return { status: "paid", ref: result.ref, payload: result.raw };
}
