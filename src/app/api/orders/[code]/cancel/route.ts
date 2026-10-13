import { errorJson, json, rateLimitResponse } from "@/lib/orders/http";
import { toPublicOrder } from "@/lib/orders/public";
import { cancelOrder, getOrderByCode, getOrderById, listOrderEvents } from "@/lib/orders/service";

/**
 * POST /api/orders/[code]/cancel — the customer abandons an unpaid order
 * (e.g. wants another package). Only pending_payment orders can be cancelled;
 * in bakong mode the service first re-checks that it wasn't paid meanwhile.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/orders/[code]/cancel">) {
  const limited = rateLimitResponse(request, "orders:cancel", 10);
  if (limited) return limited;

  const { code } = await ctx.params;
  try {
    const found = await getOrderByCode(code);
    if (!found) return errorJson("not_found", 404);
    const withOrder = async (o: typeof found) => ({ order: toPublicOrder(o, await listOrderEvents(o.id)) });

    if (found.status !== "pending_payment") return errorJson("not_pending", 409, await withOrder(found));

    const cancelled = await cancelOrder(found.id, { actor: "customer" });
    if (cancelled) return json(await withOrder(cancelled));

    const latest = (await getOrderById(found.id)) ?? found;
    // Still pending means the payment status could not be verified; refuse rather than risk losing a payment.
    if (latest.status === "pending_payment") {
      return errorJson("payment_unavailable", 503, await withOrder(latest));
    }
    return errorJson("not_pending", 409, await withOrder(latest));
  } catch (err) {
    console.error(`[api/orders/${code}/cancel] failed`, err);
    return errorJson("server_error", 500);
  }
}
