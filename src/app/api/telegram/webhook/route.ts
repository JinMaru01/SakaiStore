import { errorJson, json } from "@/lib/orders/http";
import { handleUpdate } from "@/lib/telegram/bot";
import { isDuplicateUpdate, parseUpdate, readUpdateBody, verifyWebhookSecret } from "@/lib/telegram/webhook";

/**
 * POST /api/telegram/webhook — Telegram Bot API updates (register with
 * `npm run telegram:webhook`, see docs/TELEGRAM.md).
 *
 * Auth: the `X-Telegram-Bot-Api-Secret-Token` header must equal
 * TELEGRAM_WEBHOOK_SECRET (401 otherwise; production refuses all updates when
 * the secret is unset). Every authenticated request gets 200, even when
 * handling fails: a non-2xx makes Telegram re-send the same update over and
 * over, and a broken update would block the ones behind it.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  if (!verifyWebhookSecret(request.headers)) return errorJson("unauthorized", 401);

  const update = parseUpdate(await readUpdateBody(request));
  if (!update) {
    console.warn("[telegram] ignored a malformed webhook update");
    return json({ ok: true });
  }
  if (isDuplicateUpdate(update.update_id)) return json({ ok: true });

  try {
    await handleUpdate(update);
  } catch (err) {
    console.error(`[telegram] failed to handle update ${update.update_id}`, err);
  }
  return json({ ok: true });
}
