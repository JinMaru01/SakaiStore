import { z } from "zod";
import {
  errorJson,
  firstIssueField,
  json,
  orderContextFromRequest,
  rateLimitResponse,
  readJsonBody,
} from "@/lib/orders/http";
import { toPublicOrder } from "@/lib/orders/public";
import { createOrder, isOrderError, listOrderEvents } from "@/lib/orders/service";

/** POST /api/orders — create an order and its KHQR. Prices are computed server-side. */

/** Accept numbers too (some clients send numeric IDs), then trim/limit as text. */
const text = (max: number) =>
  z.preprocess((v) => (typeof v === "number" ? String(v) : v), z.string().trim().max(max));
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "number" ? String(v) : v),
    z
      .string()
      .trim()
      .max(max)
      .nullish()
      .transform((v) => v || null),
  );

const bodySchema = z.object({
  gameSlug: z.string().trim().min(1).max(64),
  packageId: z.coerce.number().int().positive().max(2_147_483_647),
  playerId: text(64).pipe(z.string().min(1)),
  zoneId: optionalText(32),
  playerName: optionalText(120),
  promoCode: optionalText(32),
  contactPhone: optionalText(32),
  contactTelegram: optionalText(64),
});

/** Bad values in these fields get the same error code the service would return. */
const FIELD_ERRORS: Record<string, string> = {
  playerId: "invalid_id",
  zoneId: "invalid_zone",
  promoCode: "promo_not_found",
  gameSlug: "game_not_found",
  packageId: "package_not_found",
};

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "orders:create", 10);
  if (limited) return limited;

  const body = await readJsonBody(request);
  if (body === undefined || body === null || typeof body !== "object") {
    return errorJson("invalid_request", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const field = firstIssueField(parsed.error);
    return errorJson((field && FIELD_ERRORS[field]) || "invalid_request", 400, field ? { field } : {});
  }

  try {
    const order = await createOrder(parsed.data, orderContextFromRequest(request));
    const events = await listOrderEvents(order.id);
    return json({ order: toPublicOrder(order, events) }, { status: 201 });
  } catch (err) {
    if (isOrderError(err)) {
      return errorJson(err.code, err.status, err.field ? { field: err.field } : {});
    }
    console.error("[api/orders] create failed", err);
    return errorJson("server_error", 500);
  }
}
