"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Order } from "@/db/schema";
import { fail, fieldErrorsFromZod, ok, type ActionState } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth";
import {
  addOrderNote,
  cancelOrder,
  getOrderById,
  markOrderDelivered,
  markOrderFailed,
  markOrderPaid,
  markOrderProcessing,
  markOrderRefunded,
} from "@/lib/orders/service";
import { STATUS_LABELS } from "@/lib/orders/status";

/**
 * Every admin order change goes through the order service (conditional
 * UPDATEs), so a click that races a Telegram button or a payment poll is
 * simply refused: we then re-read the order and tell the owner what it is now.
 */

const orderId = z.uuid("Unknown order");
const optionalMessage = z
  .string()
  .trim()
  .max(500, "At most 500 characters")
  .optional()
  .transform((v) => v || undefined);

const orderActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("deliver"), orderId, message: optionalMessage }),
  z.object({
    intent: z.literal("fail"),
    orderId,
    reason: z
      .string({ error: "Enter a reason" })
      .trim()
      .min(3, "Enter a short reason (at least 3 characters)")
      .max(500, "At most 500 characters"),
  }),
  z.object({ intent: z.literal("retry"), orderId }),
  z.object({ intent: z.literal("refund"), orderId, message: optionalMessage }),
  z.object({ intent: z.literal("cancel"), orderId, message: optionalMessage }),
  z.object({
    intent: z.literal("mark_paid"),
    orderId,
    reference: z
      .string({ error: "Enter the payment reference" })
      .trim()
      .min(3, "Enter the bank / Bakong transaction reference")
      .max(128, "At most 128 characters"),
    confirm: z.literal("on", { error: "Confirm that the money is in your account" }),
  }),
  z.object({
    intent: z.literal("note"),
    orderId,
    note: z.string({ error: "Write a note" }).trim().min(1, "Write a note").max(2000, "At most 2000 characters"),
  }),
]);

type Intent = z.infer<typeof orderActionSchema>["intent"];

const VERBS: Record<Exclude<Intent, "note">, { doing: string; done: string }> = {
  deliver: { doing: "mark it delivered", done: "marked delivered" },
  fail: { doing: "mark it failed", done: "marked failed" },
  retry: { doing: "move it to processing", done: "moved to processing" },
  refund: { doing: "refund it", done: "marked refunded" },
  cancel: { doing: "cancel it", done: "cancelled" },
  mark_paid: { doing: "mark it paid", done: "marked paid" },
};

/** Single entry point for the order detail page and the dashboard queue (useActionState). */
export async function orderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = orderActionSchema.safeParse({
    intent: formData.get("intent"),
    orderId: formData.get("orderId"),
    message: formData.get("message") ?? undefined,
    reason: formData.get("reason") ?? undefined,
    reference: formData.get("reference") ?? undefined,
    confirm: formData.get("confirm") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return fail("Please check the form.", fieldErrorsFromZod(parsed.error));
  const input = parsed.data;

  if (input.intent === "note") {
    const order = await getOrderById(input.orderId);
    if (!order) return fail("This order no longer exists.");
    await addOrderNote(order.id, { actor: "admin", message: input.note });
    revalidatePath(`/admin/orders/${order.id}`);
    return ok("Note added.");
  }

  let updated: Order | null;
  try {
    switch (input.intent) {
      case "deliver":
        updated = await markOrderDelivered(input.orderId, {
          actor: "admin",
          message: input.message ?? "Delivered by admin",
        });
        break;
      case "fail":
        updated = await markOrderFailed(input.orderId, { actor: "admin", reason: input.reason });
        break;
      case "retry":
        updated = await markOrderProcessing(input.orderId, { actor: "admin", message: "Retrying delivery" });
        break;
      case "refund":
        updated = await markOrderRefunded(input.orderId, {
          actor: "admin",
          message: input.message ?? "Refunded by admin",
        });
        break;
      case "cancel":
        updated = await cancelOrder(input.orderId, { actor: "admin", reason: input.message ?? "Cancelled by admin" });
        break;
      case "mark_paid":
        updated = await markOrderPaid(input.orderId, {
          actor: "admin",
          ref: input.reference,
          payload: { manual: true, reference: input.reference, confirmedAt: new Date().toISOString() },
        });
        break;
    }
  } catch (err) {
    console.error(`[admin] order action ${input.intent} failed for ${input.orderId}`, err);
    return fail("Something went wrong while updating the order. Please try again.");
  }

  // Refresh every admin view (dashboard queue, nav badge, lists, this order).
  revalidatePath("/admin", "layout");

  const verb = VERBS[input.intent];
  if (!updated) {
    const current = await getOrderById(input.orderId);
    if (!current) return fail("This order no longer exists.");
    const hint =
      input.intent === "cancel" && current.status === "pending_payment"
        ? " The payment status could not be confirmed with the bank, so it was not cancelled — it will expire on its own."
        : "";
    return fail(
      `Couldn’t ${verb.doing}: order ${current.code} is now “${STATUS_LABELS[current.status]}”.${hint} The page shows its latest state.`,
    );
  }
  const now = input.intent === "mark_paid" ? ` — now ${STATUS_LABELS[updated.status]}` : "";
  return ok(`Order ${updated.code} ${verb.done}${now}.`);
}
