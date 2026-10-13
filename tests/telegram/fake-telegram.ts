import { vi } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { isPublicHttpUrl } from "@/lib/telegram/format";
import { checkTelegramHtml } from "@/lib/telegram/telegram-html";

/**
 * A fake Telegram Bot API for integration tests: stubs global fetch, records
 * every call and answers like Telegram (sendMessage returns a fresh
 * message_id). `failChat(id, description)` makes calls to that chat fail.
 * Like the real API it rejects invalid HTML, buttons pointing at localhost
 * and oversized callback data; such rejections are collected in `rejected`
 * so tests can assert there were none.
 */

export const TEST_TOKEN = "123456:TEST-token_abcdefghijklmnopqrstuvwx";
export const WEBHOOK_SECRET = "test_webhook-secret_0123456789";
export const SITE = "https://sakai.example";

export type TgCall = { method: string; params: Record<string, unknown>; result?: unknown };

type Markup = { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] } | undefined;

export function installFakeTelegram() {
  const calls: TgCall[] = [];
  const failingChats = new Map<string, string>();
  const rejected: string[] = [];
  let nextMessageId = 500;

  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = /\/bot[^/]+\/(\w+)$/.exec(url)?.[1] ?? "unknown";
    const params = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    const call: TgCall = { method, params };
    calls.push(call);

    const invalid = validate(params);
    if (invalid) {
      rejected.push(`${method}: ${invalid}`);
      return Response.json({ ok: false, error_code: 400, description: `Bad Request: ${invalid}` }, { status: 400 });
    }

    const chat = params.chat_id != null ? String(params.chat_id) : null;
    const failure = chat ? failingChats.get(chat) : undefined;
    if (failure) {
      return Response.json({ ok: false, error_code: 403, description: failure }, { status: 403 });
    }

    let result: unknown = true;
    if (method === "sendMessage") {
      result = {
        message_id: nextMessageId++,
        date: Math.floor(Date.now() / 1000),
        chat: { id: Number(params.chat_id), type: "private" },
        text: params.text,
      };
    } else if (method === "getMe") {
      result = { id: 42, is_bot: true, first_name: "Sakai Store", username: "SakaiTestBot" };
    }
    call.result = result;
    return Response.json({ ok: true, result });
  });
  vi.stubGlobal("fetch", fetchMock);

  const callsTo = (method: string) => calls.filter((c) => c.method === method);
  return {
    calls,
    rejected,
    fetchMock,
    callsTo,
    /** sendMessage calls to one chat. */
    messagesTo: (chatId: string | number) =>
      callsTo("sendMessage").filter((c) => String(c.params.chat_id) === String(chatId)),
    failChat: (chatId: string | number, description = "Forbidden: bot was blocked by the user") =>
      failingChats.set(String(chatId), description),
    reset: () => {
      calls.length = 0;
    },
  };
}

export type FakeTelegram = ReturnType<typeof installFakeTelegram>;

/** What Telegram would refuse in a sendMessage/editMessage* call, or null. */
function validate(params: Record<string, unknown>): string | null {
  if (typeof params.text === "string") {
    const problem = checkTelegramHtml(params.text);
    if (problem) return `can't parse entities: ${problem}`;
  }
  for (const button of ((params.reply_markup as Markup)?.inline_keyboard ?? []).flat()) {
    if (button.url !== undefined && !isPublicHttpUrl(button.url)) return `inline keyboard button URL '${button.url}' is invalid`;
    if (button.callback_data !== undefined && Buffer.byteLength(button.callback_data) > 64) return "BUTTON_DATA_INVALID";
  }
  return null;
}

/** message_id Telegram assigned to a sendMessage call. */
export function messageIdOf(call: TgCall): number {
  return (call.result as { message_id: number }).message_id;
}

export function keyboardOf(call: TgCall): NonNullable<Markup>["inline_keyboard"] {
  return ((call.params.reply_markup as Markup)?.inline_keyboard ?? []);
}

export function callbackDataOf(call: TgCall): string[] {
  return keyboardOf(call)
    .flat()
    .map((b) => b.callback_data)
    .filter((d): d is string => !!d);
}

export function setTelegramEnv(vars: Record<string, string> = {}) {
  const all: Record<string, string> = {
    TELEGRAM_BOT_TOKEN: TEST_TOKEN,
    TELEGRAM_BOT_USERNAME: "SakaiTestBot",
    TELEGRAM_ADMIN_CHAT_IDS: "1001,1002",
    TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
    NEXT_PUBLIC_SITE_URL: SITE,
    ...vars,
  };
  for (const [k, v] of Object.entries(all)) vi.stubEnv(k, v);
  resetEnvCache();
}
