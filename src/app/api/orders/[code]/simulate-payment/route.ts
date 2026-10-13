import { errorJson, json, rateLimitResponse } from "@/lib/orders/http";
import { toPublicOrder } from "@/lib/orders/public";
import {
  getOrderByCode,
  getOrderById,
  listOrderEvents,
  markOrderPaid,
  refreshOrderPayment,
} from "@/lib/orders/service";
import { getPaymentMode } from "@/lib/payments";

/**
 * POST /api/orders/[code]/simulate-payment — "I paid" button for demos and
 * e2e tests. Exists only in PAYMENT_MODE=mock; in bakong mode it is a 404 so
 * nobody can mark a real order paid without money.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/orders/[code]/simulate-payment">) {
  if (getPaymentMode() !== "mock") return errorJson("not_found", 404);
  const limited = rateLimitResponse(request, "orders:simulate", 10);
  if (limited) return limited;

  const { code } = await ctx.params;
  try {
    const found = await getOrderByCode(code);
    if (!found) return errorJson("not_found", 404);

    // Expire first if the payment window already closed.
    const current = await refreshOrderPayment(found);
    const windowClosed = !!current.paymentExpiresAt && current.paymentExpiresAt.getTime() <= Date.now();
    if (current.status !== "pending_payment" || windowClosed) {
      return errorJson("not_pending", 409, {
        order: toPublicOrder(current, await listOrderEvents(current.id)),
      });
    }

    const paid = await markOrderPaid(current.id, {
      ref: `MOCK-${current.code}`,
      payload: { simulated: true, at: new Date().toISOString() },
      actor: "customer",
    });
    const latest = paid ?? (await getOrderById(current.id)) ?? current;
    const body = { order: toPublicOrder(latest, await listOrderEvents(latest.id)) };
    return paid ? json(body) : errorJson("not_pending", 409, body);
  } catch (err) {
    console.error(`[api/orders/${code}/simulate-payment] failed`, err);
    return errorJson("server_error", 500);
  }
}
