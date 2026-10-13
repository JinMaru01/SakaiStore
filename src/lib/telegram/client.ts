/**
 * Minimal Telegram Bot API client built on fetch (no dependencies).
 *
 * Framework-free on purpose (no `server-only`, no `@/` imports) so
 * scripts/set-telegram-webhook.ts can use it from plain tsx. App code should
 * use the env-bound wrappers in ./api.ts instead.
 *
 *  - Every call resolves to a TelegramResult and never throws.
 *  - Every call has a timeout (10s by default): a slow Telegram must never
 *    hold up checkout or a webhook response.
 *  - The bot token is part of the request URL, so it is scrubbed from
 *    anything we log.
 *  - Without a token every call is a silent no-op ({ ok: false, skipped: true }).
 */

export const TELEGRAM_API_BASE = "https://api.telegram.org";
export const DEFAULT_TIMEOUT_MS = 10_000;
/** Telegram rejects longer message texts. */
export const MAX_MESSAGE_LENGTH = 4096;
/** Telegram rejects longer callback answers. */
export const MAX_CALLBACK_ANSWER_LENGTH = 200;

// ───────────────────────────── types (the subset we use) ─────────────────────────────

export type ChatId = number | string;

export type TgUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TgChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
};

export type TgMessage = {
  message_id: number;
  date: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
};

export type InlineKeyboardButton = { text: string; callback_data: string } | { text: string; url: string };
export type InlineKeyboardMarkup = { inline_keyboard: InlineKeyboardButton[][] };

export type BotCommand = { command: string; description: string };
export type BotCommandScope =
  | { type: "default" }
  | { type: "all_private_chats" }
  | { type: "all_group_chats" }
  | { type: "chat"; chat_id: ChatId };

export type WebhookInfo = {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
};

export type TelegramOk<T> = { ok: true; result: T };
export type TelegramError = {
  ok: false;
  /** Telegram's description (token-free) or a transport error. */
  error: string;
  /** Telegram error_code / HTTP status, when we got a response. */
  status?: number;
  /** Seconds to wait after a 429. */
  retryAfter?: number;
  /** True when the call was not attempted because no bot token is configured. */
  skipped?: boolean;
};
export type TelegramResult<T> = TelegramOk<T> | TelegramError;

export type SendMessageOptions = {
  replyMarkup?: InlineKeyboardMarkup;
  /** Link previews are off by default so alerts stay compact. */
  linkPreview?: boolean;
  /** Deliver without a notification sound. */
  silent?: boolean;
  replyToMessageId?: number;
};

export type EditMessageOptions = {
  /** null/undefined removes the inline keyboard. */
  replyMarkup?: InlineKeyboardMarkup | null;
  linkPreview?: boolean;
};

export type TelegramClientOptions = {
  timeoutMs?: number;
  apiBase?: string;
};

type ApiResponse = {
  ok?: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

const EMPTY_KEYBOARD: InlineKeyboardMarkup = { inline_keyboard: [] };

/** Editing a message to identical content is not a failure for us. */
const NOT_MODIFIED_RE = /message is not modified/i;

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

// ───────────────────────────── client ─────────────────────────────

export function createTelegramClient(token: string | null | undefined, options: TelegramClientOptions = {}) {
  const botToken = token?.trim() || null;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const apiBase = (options.apiBase ?? TELEGRAM_API_BASE).replace(/\/$/, "");

  /** Remove the token from any text before it reaches a log line or a caller. */
  const scrub = (text: string) => (botToken ? text.split(botToken).join("<token>") : text);

  /**
   * POST one Bot API method. Resolves to the typed result or a token-free
   * error description; never throws.
   */
  async function call<T>(
    method: string,
    params: Record<string, unknown> = {},
    opts: { quietErrors?: RegExp } = {},
  ): Promise<TelegramResult<T>> {
    if (!botToken) return { ok: false, skipped: true, error: "not_configured" };

    let res: Response;
    try {
      res = await fetch(`${apiBase}/bot${botToken}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // JSON.stringify drops undefined optional params.
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const reason = isTimeout(err)
        ? `timeout after ${timeoutMs}ms`
        : scrub(err instanceof Error ? err.message : String(err));
      console.error(`[telegram] ${method} failed: ${reason}`);
      return { ok: false, error: reason };
    }

    let body: ApiResponse | null = null;
    try {
      body = (await res.json()) as ApiResponse;
    } catch {
      body = null;
    }
    if (res.ok && body?.ok) return { ok: true, result: body.result as T };

    const error = scrub(body?.description ?? `HTTP ${res.status}`);
    const status = body?.error_code ?? res.status;
    const retryAfter = body?.parameters?.retry_after;
    if (!opts.quietErrors?.test(error)) {
      console.error(
        `[telegram] ${method} failed: ${status} ${error}${retryAfter ? ` (retry after ${retryAfter}s)` : ""}`,
      );
    }
    return { ok: false, error, status, retryAfter };
  }

  /** editMessage* resolve to the edited Message, or `true`; "not modified" counts as success. */
  async function edit(method: string, params: Record<string, unknown>): Promise<TelegramResult<TgMessage | true>> {
    const res = await call<TgMessage | true>(method, params, { quietErrors: NOT_MODIFIED_RE });
    if (!res.ok && NOT_MODIFIED_RE.test(res.error)) return { ok: true, result: true };
    return res;
  }

  return {
    /** True when a bot token is set (calls are attempted). */
    configured: botToken !== null,
    call,

    getMe: () => call<TgUser>("getMe"),

    sendMessage: (chatId: ChatId, text: string, opts: SendMessageOptions = {}) =>
      call<TgMessage>("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: !opts.linkPreview },
        disable_notification: opts.silent || undefined,
        reply_markup: opts.replyMarkup,
        reply_parameters: opts.replyToMessageId
          ? { message_id: opts.replyToMessageId, allow_sending_without_reply: true }
          : undefined,
      }),

    editMessageText: (chatId: ChatId, messageId: number, text: string, opts: EditMessageOptions = {}) =>
      edit("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: !opts.linkPreview },
        reply_markup: opts.replyMarkup ?? EMPTY_KEYBOARD,
      }),

    editMessageReplyMarkup: (chatId: ChatId, messageId: number, replyMarkup: InlineKeyboardMarkup | null) =>
      edit("editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: replyMarkup ?? EMPTY_KEYBOARD,
      }),

    answerCallbackQuery: (callbackQueryId: string, opts: { text?: string; showAlert?: boolean } = {}) =>
      call<true>("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text: opts.text ? opts.text.slice(0, MAX_CALLBACK_ANSWER_LENGTH) : undefined,
        show_alert: opts.showAlert || undefined,
      }),

    setWebhook: (p: {
      url: string;
      secretToken?: string;
      allowedUpdates?: string[];
      dropPendingUpdates?: boolean;
      maxConnections?: number;
    }) =>
      call<true>("setWebhook", {
        url: p.url,
        secret_token: p.secretToken,
        allowed_updates: p.allowedUpdates,
        drop_pending_updates: p.dropPendingUpdates,
        max_connections: p.maxConnections,
      }),

    deleteWebhook: (p: { dropPendingUpdates?: boolean } = {}) =>
      call<true>("deleteWebhook", { drop_pending_updates: p.dropPendingUpdates }),

    getWebhookInfo: () => call<WebhookInfo>("getWebhookInfo"),

    setMyCommands: (commands: BotCommand[], opts: { scope?: BotCommandScope; languageCode?: string } = {}) =>
      call<true>("setMyCommands", { commands, scope: opts.scope, language_code: opts.languageCode }),
  };
}

export type TelegramClient = ReturnType<typeof createTelegramClient>;
