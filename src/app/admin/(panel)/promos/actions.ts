"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, fieldErrorsFromZod, formBool, formString, isUniqueViolation, ok, type ActionState } from "@/lib/admin/forms";
import { isDbId } from "@/lib/admin/games";
import { promoFormSchema } from "@/lib/admin/promo-schema";
import { createPromo, deletePromo, gameExists, getAdminPromo, setPromoActive, updatePromo } from "@/lib/admin/promos";
import { requireAdmin } from "@/lib/auth";

const FIELDS = ["code", "description", "type", "value", "maxDiscount", "minOrder", "maxUses", "gameId", "channel", "startsAt", "endsAt"] as const;

/** Promo codes affect checkout and the "Follow us" section, so refresh storefront + admin. */
function revalidatePromos() {
  revalidatePath("/", "layout");
}

/**
 * Create (promoId = null, bound) or update a promo code. Creating redirects
 * back to the list; updating returns a result for the form.
 */
export async function savePromoAction(promoId: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (promoId !== null && !isDbId(promoId)) return fail("Unknown promo code.");

  const raw = Object.fromEntries(FIELDS.map((k) => [k, formString(formData, k)]));
  const parsed = promoFormSchema.safeParse({ ...raw, active: formBool(formData, "active") });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
  const data = parsed.data;
  if (data.gameId != null && !(await gameExists(data.gameId))) {
    return fail("Please fix the highlighted fields.", { gameId: "That game no longer exists" });
  }

  try {
    if (promoId === null) {
      await createPromo(data);
    } else if (!(await updatePromo(promoId, data))) {
      return fail("This promo code no longer exists.");
    }
  } catch (err) {
    if (isUniqueViolation(err)) return fail("That code already exists.", { code: `${data.code} is already used by another promo` });
    console.error("[admin] saving promo failed", err);
    return fail("Could not save the promo code. Please try again.");
  }

  revalidatePromos();
  if (promoId === null) redirect("/admin/promos?flash=promo_created");
  return ok(`${data.code} saved.`);
}

const idSchema = z.object({ promoId: z.coerce.number().int().positive() });

export async function deletePromoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ promoId: formData.get("promoId") });
  if (!parsed.success) return fail("Unknown promo code.");
  const promo = await getAdminPromo(parsed.data.promoId);
  if (!promo) return fail("This promo code no longer exists.");
  await deletePromo(promo.id);
  revalidatePromos();
  redirect("/admin/promos?flash=promo_deleted");
}

/** Inline Active switch on the promo list. */
export async function togglePromoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = idSchema.extend({ value: z.enum(["true", "false"]) }).safeParse({
    promoId: formData.get("promoId"),
    value: formData.get("value"),
  });
  if (!parsed.success) return;
  await setPromoActive(parsed.data.promoId, parsed.data.value === "true");
  revalidatePromos();
}
