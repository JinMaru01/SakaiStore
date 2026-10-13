import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";

/**
 * Inbound webhook plumbing for POST /api/telegram/webhook: secret check,
 * size-capped body read, defensive update parsing and a small duplicate guard.
 */

/** Telegram echoes the secret_token given to setWebhook in this header. */
export const SECRET_HEADER = "x-telegram-bot-api-secret-token";

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Constant-time check of the secret header against TELEGRAM_WEBHOOK_SECRET.
 * Without a configured secret only non-production environments accept
 * updates (local testing); production rejects everything.
 */
export function verifyWebhookSecret(headers: Headers): boolean {
  const { TELEGRAM_WEBHOOK_SECRET: secret, NODE_ENV } = env();
  if (!secret) return NODE_ENV !== "production";
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  return timingSafeEqual(digest(headers.get(SECRET_HEADER) ?? ""), digest(secret));
}

/** Updates are a few KB; anything near this is not from Telegram. */
const MAX_UPDATE_BYTES = 256 * 1024;

/** Read and JSON-parse the body; undefined when missing, too large or malformed. */
export async function readUpdateBody(request: Request, max = MAX_UPDATE_BYTES): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return undefined;
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => {});
        return undefined;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

// Only the fields we use. Unknown keys are stripped; a malformed optional part
// (e.g. an unusual message) is dropped instead of failing the whole update.
const userSchema = z.object({
  id: z.number().int(),
  is_bot: z.boolean().optional().catch(undefined),
  first_name: z.string().max(256).catch(""),
  username: z.string().max(64).optional().catch(undefined),
  language_code: z.string().max(35).optional().catch(undefined),
});

const chatSchema = z.object({
  id: z.number().int(),
  type: z.string().max(32),
});

const messageSchema = z.object({
  message_id: z.number().int(),
  chat: chatSchema,
  from: userSchema.optional().catch(undefined),
  text: z.string().max(4096).optional().catch(undefined),
});

const callbackQuerySchema = z.object({
  id: z.string().min(1).max(256),
  from: userSchema,
  // Missing for inline-mode messages; "inaccessible" (date 0) for very old ones.
  message: z.object({ message_id: z.number().int(), chat: chatSchema }).optional().catch(undefined),
  data: z.string().max(64).optional().catch(undefined),
});

const updateSchema = z.object({
  update_id: z.number().int(),
  message: messageSchema.optional().catch(undefined),
  callback_query: callbackQuerySchema.optional().catch(undefined),
});

export type TelegramUpdate = z.infer<typeof updateSchema>;
export type IncomingMessage = NonNullable<TelegramUpdate["message"]>;
export type IncomingCallbackQuery = NonNullable<TelegramUpdate["callback_query"]>;
export type IncomingUser = IncomingCallbackQuery["from"];

export function parseUpdate(body: unknown): TelegramUpdate | null {
  const parsed = updateSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

// Telegram re-delivers an update when our response is slow or fails. Status
// changes are idempotent anyway; this just avoids answering a command twice.
const SEEN_LIMIT = 1000;
const seen = new Set<number>();

/** True if this update id was already handled by this server instance. */
export function isDuplicateUpdate(updateId: number): boolean {
  if (seen.has(updateId)) return true;
  seen.add(updateId);
  if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!);
  return false;
}

/** For tests. */
export function resetSeenUpdates(): void {
  seen.clear();
}
