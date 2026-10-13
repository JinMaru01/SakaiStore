import "server-only";
import { cache } from "react";
import { inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";

/**
 * Store settings editable from /admin/settings. Each top-level key is one row
 * in the `settings` table; missing rows/fields fall back to DEFAULTS, so the
 * site works on an empty database.
 */

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Must start with http:// or https://")
  .default("");

const localized = z.object({ en: z.string().max(500).default(""), km: z.string().max(500).default("") });

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(1).max(60).default("Sakai Store"),
  tagline: localized.default({
    en: "Fast & cheap game top-up in Cambodia",
    km: "បញ្ចូលហ្គេមលឿន និងថោកបំផុតនៅកម្ពុជា",
  }),
  /** Site-wide announcement bar; empty = hidden. */
  announcement: localized.default({ en: "", km: "" }),
  supportPhone: z.string().trim().max(32).default(""),
  /** Telegram username for support, without @. */
  supportTelegram: z.string().trim().max(64).default(""),
  /** Display-only exchange rate for showing KHR next to USD prices. */
  khrPerUsd: z.coerce.number().int().min(1000).max(10000).default(4100),
});

export const socialSettingsSchema = z.object({
  facebookUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  telegramUrl: optionalUrl,
  /** m.me/<page> link for Messenger chat. */
  messengerUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  instagramUrl: optionalUrl,
});

export const marketingSettingsSchema = z.object({
  /** Promo code advertised to people who follow the Facebook page / TikTok. */
  followPromoCode: z.string().trim().max(32).default(""),
  /** Always appended to generated captions. */
  defaultHashtags: z
    .string()
    .trim()
    .max(300)
    .default("#SakaiStore #GameTopUp #Cambodia #TopUpKH"),
});

export const settingsSchema = z.object({
  store: storeSettingsSchema.default(storeSettingsSchema.parse({})),
  social: socialSettingsSchema.default(socialSettingsSchema.parse({})),
  marketing: marketingSettingsSchema.default(marketingSettingsSchema.parse({})),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type SocialSettings = z.infer<typeof socialSettingsSchema>;
export type MarketingSettings = z.infer<typeof marketingSettingsSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type SettingsKey = keyof Settings;

const SECTION_SCHEMAS = {
  store: storeSettingsSchema,
  social: socialSettingsSchema,
  marketing: marketingSettingsSchema,
} as const;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/**
 * Read all settings (merged over defaults). Invalid stored values fall back to
 * defaults. Deduplicated per request via React cache().
 */
export const getSettings = cache(async function getSettings(): Promise<Settings> {
  let rows: { key: string; value: unknown }[] = [];
  try {
    rows = await db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable)
      .where(inArray(settingsTable.key, Object.keys(SECTION_SCHEMAS)));
  } catch (err) {
    console.error("[settings] failed to load, using defaults", err);
    return DEFAULT_SETTINGS;
  }
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const row of rows) {
    const key = row.key as SettingsKey;
    const parsed = SECTION_SCHEMAS[key].safeParse(row.value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as Settings;
});

/** Validate and upsert one settings section. Throws ZodError on invalid input. */
export async function updateSettings<K extends SettingsKey>(
  key: K,
  value: z.input<(typeof SECTION_SCHEMAS)[K]>,
): Promise<Settings[K]> {
  const parsed = SECTION_SCHEMAS[key].parse(value) as Settings[K];
  await db
    .insert(settingsTable)
    .values({ key, value: parsed })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: parsed, updatedAt: sql`now()` },
    });
  return parsed;
}
