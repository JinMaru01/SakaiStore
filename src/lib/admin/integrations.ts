import "server-only";
import { env } from "@/lib/env";
import { readPixelConfig } from "@/lib/tracking/pixels";

/**
 * Read-only "is it configured?" view of the environment for /admin/settings.
 * Returns booleans and non-secret modes only — never a token, password, chat
 * id or account id — so it is safe to render.
 */

export type IntegrationLevel = "ok" | "warn" | "off";

export type IntegrationItem = {
  label: string;
  /** Short value shown on the right: "Configured", "Not set", "bakong", "2 chats"… */
  value: string;
  level: IntegrationLevel;
  hint?: string;
};

export type IntegrationGroup = { title: string; items: IntegrationItem[] };

const set = (v: string | undefined | null) => typeof v === "string" && v.trim() !== "";

function configured(label: string, isSet: boolean, hint: string, missingLevel: IntegrationLevel = "warn"): IntegrationItem {
  return { label, value: isSet ? "Configured" : "Not set", level: isSet ? "ok" : missingLevel, hint: isSet ? undefined : hint };
}

/** A pixel id that is set but malformed is ignored by the site: say so instead of "Configured". */
function pixelItem(label: string, raw: string | undefined, valid: string | null, hint: string, format: string): IntegrationItem {
  if (valid) return { label, value: "Configured", level: "ok" };
  if (set(raw)) {
    return { label, value: "Set but invalid — not loaded", level: "warn", hint: `Expected ${format}. Fix the value and redeploy.` };
  }
  return { label, value: "Not set", level: "off", hint };
}

export function getIntegrationStatus(): IntegrationGroup[] {
  const e = env();
  const production = e.NODE_ENV === "production";
  const bakong = e.PAYMENT_MODE === "bakong";
  // NEXT_PUBLIC_* pixel ids are inlined at build time, exactly like in
  // <TrackingScripts>, so this shows what the live site actually loads.
  const fbPixel = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const ttPixel = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const pixels = readPixelConfig({ NEXT_PUBLIC_FB_PIXEL_ID: fbPixel, NEXT_PUBLIC_TIKTOK_PIXEL_ID: ttPixel });
  const adminChats = e.TELEGRAM_ADMIN_CHAT_IDS.length;

  return [
    {
      title: "Payments (KHQR)",
      items: [
        {
          label: "Payment mode",
          value: e.PAYMENT_MODE,
          level: bakong ? "ok" : production ? "warn" : "off",
          hint: bakong
            ? undefined
            : "Mock mode: orders can be marked paid without money. Set PAYMENT_MODE=bakong before launch.",
        },
        configured("Bakong account (BAKONG_ACCOUNT_ID)", set(e.BAKONG_ACCOUNT_ID), "Needed to generate real KHQR codes.", bakong ? "warn" : "off"),
        configured("Bakong API token (BAKONG_API_TOKEN)", set(e.BAKONG_API_TOKEN), "Needed to confirm payments automatically.", bakong ? "warn" : "off"),
        { label: "Payment window", value: `${e.PAYMENT_TIMEOUT_MINUTES} min`, level: "ok" },
      ],
    },
    {
      title: "Orders",
      items: [
        {
          label: "Fulfillment mode",
          value: e.FULFILLMENT_MODE,
          level: e.FULFILLMENT_MODE === "manual" || !production ? "ok" : "warn",
          hint: e.FULFILLMENT_MODE === "mock" ? "Mock mode marks orders delivered without a real top-up." : undefined,
        },
        { label: "Player name lookup", value: e.PLAYER_LOOKUP_MODE, level: "ok" },
        configured("Cron secret (CRON_SECRET)", set(e.CRON_SECRET), "Without it the payment reconcile cron cannot run.", production ? "warn" : "off"),
      ],
    },
    {
      title: "Telegram",
      items: [
        configured("Bot token (TELEGRAM_BOT_TOKEN)", set(e.TELEGRAM_BOT_TOKEN), "Admin alerts and customer updates are off."),
        configured("Bot username (TELEGRAM_BOT_USERNAME)", set(e.TELEGRAM_BOT_USERNAME), "Customers cannot link Telegram for order updates."),
        {
          label: "Admin chats (TELEGRAM_ADMIN_CHAT_IDS)",
          value: adminChats ? `${adminChats} configured` : "Not set",
          level: adminChats ? "ok" : "warn",
          hint: adminChats ? undefined : "Nobody receives paid-order alerts.",
        },
        configured("Webhook secret (TELEGRAM_WEBHOOK_SECRET)", set(e.TELEGRAM_WEBHOOK_SECRET), "Required to accept Telegram webhooks safely."),
      ],
    },
    {
      title: "Ads & tracking",
      items: [
        pixelItem("Meta Pixel (NEXT_PUBLIC_FB_PIXEL_ID)", fbPixel, pixels.metaPixelId, "Facebook ads cannot measure purchases.", "digits only"),
        pixelItem("TikTok Pixel (NEXT_PUBLIC_TIKTOK_PIXEL_ID)", ttPixel, pixels.tiktokPixelId, "TikTok ads cannot measure purchases.", "capital letters and digits"),
      ],
    },
    {
      title: "Security",
      items: [
        configured("Admin password (ADMIN_PASSWORD)", set(e.ADMIN_PASSWORD), "Admin sign-in is disabled."),
        {
          label: "Session secret (AUTH_SECRET)",
          value: e.AUTH_SECRET.startsWith("dev-only") ? "Development default" : "Configured",
          level: e.AUTH_SECRET.startsWith("dev-only") ? (production ? "warn" : "off") : "ok",
          hint: e.AUTH_SECRET.startsWith("dev-only") ? "Set a long random AUTH_SECRET in production." : undefined,
        },
      ],
    },
  ];
}
