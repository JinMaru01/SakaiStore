import { normalizeOrderCode } from "@/lib/orders/code";
import { errorJson, json, rateLimitResponse } from "@/lib/orders/http";
import { toPublicOrder } from "@/lib/orders/public";
import { getOrderByCode, listOrderEvents, refreshOrderPayment } from "@/lib/orders/service";

/**
 * GET /api/orders/[code] — polled by the order page every few seconds. For
 * pending orders this also asks the payment provider (throttled per order)
 * and expires the order when its KHQR window has closed.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: RouteContext<"/api/orders/[code]">) {
  const { code } = await ctx.params;
  // Cambodian carriers put many phones behind one CGNAT IP, so a tight per-IP
  // cap would throttle real customers polling their own orders during a promo.
  // Budget per (IP, order) — 4x the 4 s polling rate — plus a wide per-IP
  // ceiling; 31^8 random codes make enumeration hopeless at either rate.
  const limited =
    rateLimitResponse(request, "orders:get", 1200) ??
    rateLimitResponse(request, `orders:get:${normalizeOrderCode(code) ?? "invalid"}`, 60);
  if (limited) return limited;

  try {
    const found = await getOrderByCode(code);
    if (!found) return errorJson("not_found", 404);
    const order = found.status === "pending_payment" ? await refreshOrderPayment(found) : found;
    const events = await listOrderEvents(order.id);
    return json({ order: toPublicOrder(order, events) });
  } catch (err) {
    console.error(`[api/orders/${code}] failed`, err);
    return errorJson("server_error", 500);
  }
}
