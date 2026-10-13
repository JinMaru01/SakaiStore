import "server-only";
import { z } from "zod";

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://sakai:sakai@localhost:5432/sakaistore"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16).default("dev-only-secret-do-not-use-in-production-0123456789"),
  ADMIN_PASSWORD: z.string().optional(),

  PAYMENT_MODE: z.enum(["mock", "bakong"]).default("mock"),
  BAKONG_ACCOUNT_ID: z.string().optional(),
  BAKONG_MERCHANT_NAME: z.string().default("Sakai Store"),
  BAKONG_MERCHANT_CITY: z.string().default("Phnom Penh"),
  BAKONG_API_TOKEN: z.string().optional(),
  BAKONG_API_BASE: z.string().url().default("https://api-bakong.nbc.gov.kh"),
  PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().min(2).max(120).default(15),

  FULFILLMENT_MODE: z.enum(["manual", "mock"]).default("manual"),
  PLAYER_LOOKUP_MODE: z.enum(["none", "mock"]).default("none"),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_IDS: csv,
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Parsed, typed server environment. Lazy so that `next build` does not fail
 * when runtime-only secrets are absent. Empty strings are treated as unset.
 */
export function env(): Env {
  if (cached) return cached;
  const raw: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) raw[k] = v === "" ? undefined : v;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "Invalid environment configuration:\n" +
        parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"),
    );
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.AUTH_SECRET.startsWith("dev-only")) {
    console.warn("[env] AUTH_SECRET is using the development default. Set a real secret!");
  }
  cached = parsed.data;
  return cached;
}

/** For tests: drop the cached env so a changed process.env is re-read. */
export function resetEnvCache() {
  cached = undefined;
}

export const siteUrl = () => env().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
