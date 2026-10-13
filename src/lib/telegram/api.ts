import "server-only";
import { env } from "@/lib/env";
import { createTelegramClient, type TelegramClient } from "./client";

/**
 * Env-bound Telegram Bot API (TELEGRAM_BOT_TOKEN). Every function no-ops
 * gracefully — resolving to `{ ok: false, skipped: true }` — when the bot is
 * not configured, so callers never need to check first. See ./client.ts for
 * timeouts, logging and token scrubbing.
 */

export type {
  BotCommand,
  BotCommandScope,
  ChatId,
  EditMessageOptions,
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  SendMessageOptions,
  TelegramResult,
  TgChat,
  TgMessage,
  TgUser,
  WebhookInfo,
} from "./client";

/** A client for the current token (cheap to create; env() is cached). */
export function telegramClient(): TelegramClient {
  return createTelegramClient(env().TELEGRAM_BOT_TOKEN);
}

export function isTelegramConfigured(): boolean {
  return !!env().TELEGRAM_BOT_TOKEN?.trim();
}

/** Numeric chat ids from TELEGRAM_ADMIN_CHAT_IDS (users or groups), de-duplicated. */
export function adminChatIds(): string[] {
  const ids = env().TELEGRAM_ADMIN_CHAT_IDS.filter((id) => /^-?\d{1,20}$/.test(id));
  return [...new Set(ids)];
}

/**
 * True when any of the given ids (a user id or a chat id) is configured as an
 * admin chat. A configured group id makes every member of that group an admin.
 */
export function isAdminChat(...ids: (number | string | null | undefined)[]): boolean {
  const admins = adminChatIds();
  return ids.some((id) => id != null && admins.includes(String(id)));
}

/** Bot username without "@", or null when unset/invalid. */
export function botUsername(): string | null {
  const name = env().TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  return name && /^\w{3,64}$/.test(name) ? name : null;
}

type Client = TelegramClient;

export const getMe = (...a: Parameters<Client["getMe"]>) => telegramClient().getMe(...a);
export const sendMessage = (...a: Parameters<Client["sendMessage"]>) => telegramClient().sendMessage(...a);
export const editMessageText = (...a: Parameters<Client["editMessageText"]>) =>
  telegramClient().editMessageText(...a);
export const editMessageReplyMarkup = (...a: Parameters<Client["editMessageReplyMarkup"]>) =>
  telegramClient().editMessageReplyMarkup(...a);
export const answerCallbackQuery = (...a: Parameters<Client["answerCallbackQuery"]>) =>
  telegramClient().answerCallbackQuery(...a);
export const setWebhook = (...a: Parameters<Client["setWebhook"]>) => telegramClient().setWebhook(...a);
export const deleteWebhook = (...a: Parameters<Client["deleteWebhook"]>) => telegramClient().deleteWebhook(...a);
export const getWebhookInfo = (...a: Parameters<Client["getWebhookInfo"]>) => telegramClient().getWebhookInfo(...a);
export const setMyCommands = (...a: Parameters<Client["setMyCommands"]>) => telegramClient().setMyCommands(...a);
