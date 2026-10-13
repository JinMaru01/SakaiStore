import "dotenv/config";
import { createTelegramClient } from "../src/lib/telegram/client";
import { ADMIN_COMMANDS, CUSTOMER_COMMANDS, CUSTOMER_COMMANDS_KM } from "../src/lib/telegram/commands";

/**
 * Point the Telegram bot at this site and register its command menus.
 * Run after deploying (and whenever the domain or secret changes):
 *
 *   npx tsx scripts/set-telegram-webhook.ts                   # uses NEXT_PUBLIC_SITE_URL
 *   npx tsx scripts/set-telegram-webhook.ts --url https://…   # another public base URL (e.g. a tunnel)
 *   npx tsx scripts/set-telegram-webhook.ts --info            # show the current webhook status only
 *   npx tsx scripts/set-telegram-webhook.ts --delete          # remove the webhook
 *
 * Reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_ADMIN_CHAT_IDS,
 * TELEGRAM_BOT_USERNAME and NEXT_PUBLIC_SITE_URL from the environment / .env.
 * See docs/TELEGRAM.md.
 */

const WEBHOOK_PATH = "/api/telegram/webhook";
/** Characters Telegram allows in secret_token. */
const SECRET_RE = /^[A-Za-z0-9_-]{1,256}$/;

const env = (name: string) => process.env[name]?.trim() || undefined;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function printWebhookInfo(info: {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  allowed_updates?: string[];
}) {
  console.log(`  url:              ${info.url || "(none)"}`);
  console.log(`  pending updates:  ${info.pending_update_count}`);
  if (info.allowed_updates) console.log(`  allowed updates:  ${info.allowed_updates.join(", ")}`);
  if (info.last_error_message) {
    const when = info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : "unknown time";
    console.log(`  last error:       ${info.last_error_message} (${when})`);
  }
}

async function main() {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) fail("TELEGRAM_BOT_TOKEN is not set (get one from @BotFather).");
  const tg = createTelegramClient(token, { timeoutMs: 15_000 });

  const me = await tg.getMe();
  if (!me.ok) fail(`getMe failed: ${me.error}. Is TELEGRAM_BOT_TOKEN correct?`);
  console.log(`✓ Bot: @${me.result.username} (id ${me.result.id}, ${me.result.first_name})`);
  const configuredName = env("TELEGRAM_BOT_USERNAME")?.replace(/^@/, "");
  if (!configuredName) {
    console.warn(`⚠ TELEGRAM_BOT_USERNAME is not set: set it to ${me.result.username} so customers can link orders.`);
  } else if (configuredName.toLowerCase() !== me.result.username?.toLowerCase()) {
    console.warn(`⚠ TELEGRAM_BOT_USERNAME=${configuredName} but the token belongs to @${me.result.username}.`);
  }

  if (process.argv.includes("--info")) {
    const info = await tg.getWebhookInfo();
    if (!info.ok) fail(`getWebhookInfo failed: ${info.error}`);
    console.log("Webhook:");
    printWebhookInfo(info.result);
    return;
  }

  if (process.argv.includes("--delete")) {
    const res = await tg.deleteWebhook({ dropPendingUpdates: false });
    if (!res.ok) fail(`deleteWebhook failed: ${res.error}`);
    console.log("✓ Webhook removed. The bot will not receive updates until you run this script again.");
    return;
  }

  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  if (!secret) fail("TELEGRAM_WEBHOOK_SECRET is not set. Generate one: openssl rand -hex 32");
  if (!SECRET_RE.test(secret)) fail("TELEGRAM_WEBHOOK_SECRET may only contain A-Z, a-z, 0-9, _ and - (max 256).");

  const base = (argValue("--url") ?? env("NEXT_PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    fail(`Invalid site URL "${base}". Set NEXT_PUBLIC_SITE_URL or pass --url https://your-domain.`);
  }
  if (parsed.protocol !== "https:") {
    fail(
      `Telegram only delivers webhooks over HTTPS, got ${base}. ` +
        "Deploy first, or expose your dev server with a tunnel (cloudflared/ngrok) and pass --url.",
    );
  }
  const url = `${base}${WEBHOOK_PATH}`;

  const set = await tg.setWebhook({
    url,
    secretToken: secret,
    allowedUpdates: ["message", "callback_query"],
    dropPendingUpdates: true,
    maxConnections: 20,
  });
  if (!set.ok) fail(`setWebhook failed: ${set.error}`);
  console.log(`✓ Webhook set: ${url}`);

  const menus = await Promise.all([
    tg.setMyCommands(CUSTOMER_COMMANDS),
    tg.setMyCommands(CUSTOMER_COMMANDS_KM, { languageCode: "km" }),
  ]);
  if (menus.every((r) => r.ok)) console.log("✓ Customer command menu set (English + Khmer)");
  else console.warn("⚠ Could not set the customer command menu (see errors above).");

  const adminIds = [
    ...new Set(
      (env("TELEGRAM_ADMIN_CHAT_IDS") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  if (adminIds.length === 0) {
    console.warn("⚠ TELEGRAM_ADMIN_CHAT_IDS is empty: nobody will receive paid-order alerts.");
  }
  for (const id of adminIds) {
    if (!/^-?\d{1,20}$/.test(id)) {
      console.warn(`⚠ Skipping admin chat "${id}": chat ids are numbers (send /id to the bot to see yours).`);
      continue;
    }
    const res = await tg.setMyCommands(ADMIN_COMMANDS, { scope: { type: "chat", chat_id: id } });
    if (res.ok) console.log(`✓ Admin command menu set for chat ${id}`);
    else console.warn(`⚠ Admin chat ${id}: ${res.error} (has this chat sent /start to the bot yet?)`);
  }

  const info = await tg.getWebhookInfo();
  if (info.ok) {
    console.log("Webhook status:");
    printWebhookInfo(info.result);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
