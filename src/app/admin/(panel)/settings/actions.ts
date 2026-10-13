"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { fail, fieldErrorsFromZod, formString, ok, type ActionState } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth";
import { evaluatePromo } from "@/lib/orders/pricing";
import { findPromoByCode } from "@/lib/orders/promos";
import {
  marketingSettingsSchema,
  socialSettingsSchema,
  storeSettingsSchema,
  updateSettings,
  type SettingsKey,
} from "@/lib/settings";

const readStore = (fd: FormData) => ({
  name: formString(fd, "name"),
  tagline: { en: formString(fd, "tagline.en"), km: formString(fd, "tagline.km") },
  announcement: { en: formString(fd, "announcement.en"), km: formString(fd, "announcement.km") },
  supportPhone: formString(fd, "supportPhone"),
  supportTelegram: formString(fd, "supportTelegram").trim().replace(/^@/, ""),
  khrPerUsd: formString(fd, "khrPerUsd"),
});

const readSocial = (fd: FormData) => ({
  facebookUrl: formString(fd, "facebookUrl"),
  tiktokUrl: formString(fd, "tiktokUrl"),
  telegramUrl: formString(fd, "telegramUrl"),
  messengerUrl: formString(fd, "messengerUrl"),
  youtubeUrl: formString(fd, "youtubeUrl"),
  instagramUrl: formString(fd, "instagramUrl"),
});

const readMarketing = (fd: FormData) => ({
  followPromoCode: formString(fd, "followPromoCode").replace(/\s+/g, "").toUpperCase(),
  defaultHashtags: formString(fd, "defaultHashtags"),
});

const invalid = (error: z.ZodError) => fail("Please fix the highlighted fields.", fieldErrorsFromZod(error));

/** A follower code that does not work at checkout is a bad first impression: warn, but keep it. */
async function followCodeWarning(code: string): Promise<string | null> {
  if (!code) return null;
  const promo = await findPromoByCode(code);
  if (!promo) return `promo code ${code} does not exist yet — create it in Promo codes.`;
  const check = evaluatePromo(promo, { subtotalCents: 1_000_000, gameId: promo.gameId ?? 0 });
  return check.ok ? null : `${code} is not usable right now (${check.error.replaceAll("_", " ")}).`;
}

/**
 * Save one settings section (the action is bound per form). Field errors use
 * the form's dotted names, e.g. "tagline.en", so each input shows its own.
 */
export async function saveSettingsAction(section: SettingsKey, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  let warning: string | null = null;
  try {
    switch (section) {
      case "store": {
        const parsed = storeSettingsSchema.safeParse(readStore(formData));
        if (!parsed.success) return invalid(parsed.error);
        await updateSettings("store", parsed.data);
        break;
      }
      case "social": {
        const parsed = socialSettingsSchema.safeParse(readSocial(formData));
        if (!parsed.success) return invalid(parsed.error);
        await updateSettings("social", parsed.data);
        break;
      }
      case "marketing": {
        const parsed = marketingSettingsSchema.safeParse(readMarketing(formData));
        if (!parsed.success) return invalid(parsed.error);
        await updateSettings("marketing", parsed.data);
        warning = await followCodeWarning(parsed.data.followPromoCode);
        break;
      }
      default:
        return fail("Unknown settings section.");
    }
  } catch (err) {
    console.error(`[admin] saving ${String(section)} settings failed`, err);
    return fail("Could not save settings. Please try again.");
  }
  // Settings render in the storefront header/footer/metadata and in the admin shell.
  revalidatePath("/", "layout");
  return ok(warning ? `Saved — but ${warning}` : "Settings saved.");
}
