import { afterEach, describe, expect, it, vi } from "vitest";
import { createTelegramClient } from "./client";

const TOKEN = "999888:SECRET-token_value";

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => impl(String(input), init ?? {}));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const ok = (result: unknown) => Response.json({ ok: true, result });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createTelegramClient", () => {
  it("is a silent no-op without a token", async () => {
    const fetchMock = stubFetch(async () => {
      throw new Error("must not be called");
    });
    const tg = createTelegramClient("  ");
    expect(tg.configured).toBe(false);
    expect(await tg.sendMessage(1, "hi")).toEqual({ ok: false, skipped: true, error: "not_configured" });
    expect(await tg.answerCallbackQuery("q")).toMatchObject({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs JSON with parse_mode HTML and returns the typed result", async () => {
    const fetchMock = stubFetch(async () => ok({ message_id: 7, date: 1, chat: { id: 5, type: "private" } }));
    const tg = createTelegramClient(TOKEN);
    const res = await tg.sendMessage(5, "<b>hi</b>", {
      replyMarkup: { inline_keyboard: [[{ text: "✅", callback_data: "ord:dlv:SK22222222" }]] },
    });

    expect(res).toEqual({ ok: true, result: expect.objectContaining({ message_id: 7 }) });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
    expect(init!.method).toBe("POST");
    expect(JSON.parse(String(init!.body))).toEqual({
      chat_id: 5,
      text: "<b>hi</b>",
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: { inline_keyboard: [[{ text: "✅", callback_data: "ord:dlv:SK22222222" }]] },
    });
    expect(init!.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns Telegram errors and logs them without the token", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(async () =>
      Response.json(
        { ok: false, error_code: 400, description: `Bad Request: chat not found (bot${TOKEN})` },
        { status: 400 },
      ),
    );
    const res = await createTelegramClient(TOKEN).sendMessage(5, "hi");
    expect(res).toMatchObject({ ok: false, status: 400 });
    expect(JSON.stringify(res)).not.toContain(TOKEN);
    expect(err).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(err.mock.calls)).not.toContain(TOKEN);
    expect(String(err.mock.calls[0]![0])).toContain("chat not found");
  });

  it("reports 429 retry_after", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(async () =>
      Response.json(
        { ok: false, error_code: 429, description: "Too Many Requests", parameters: { retry_after: 3 } },
        { status: 429 },
      ),
    );
    expect(await createTelegramClient(TOKEN).getMe()).toMatchObject({ ok: false, status: 429, retryAfter: 3 });
  });

  it("scrubs the token from network errors", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(async (url) => {
      throw new TypeError(`fetch failed: ${url}`);
    });
    const res = await createTelegramClient(TOKEN).sendMessage(5, "hi");
    expect(res.ok).toBe(false);
    expect(JSON.stringify(res)).not.toContain(TOKEN);
    expect(JSON.stringify(err.mock.calls)).not.toContain(TOKEN);
  });

  it("gives up after the timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
        }),
    );
    const res = await createTelegramClient(TOKEN, { timeoutMs: 20 }).sendMessage(5, "hi");
    expect(res).toEqual({ ok: false, error: "timeout after 20ms" });
  });

  it("treats 'message is not modified' as success and does not log it", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(async () =>
      Response.json(
        { ok: false, error_code: 400, description: "Bad Request: message is not modified: specified new message content…" },
        { status: 400 },
      ),
    );
    expect(await createTelegramClient(TOKEN).editMessageText(5, 9, "same")).toEqual({ ok: true, result: true });
    expect(err).not.toHaveBeenCalled();
  });

  it("removes the inline keyboard when editing without one", async () => {
    const fetchMock = stubFetch(async () => ok(true));
    await createTelegramClient(TOKEN).editMessageText(5, 9, "done", { replyMarkup: null });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)).reply_markup).toEqual({ inline_keyboard: [] });
  });

  it("caps callback answers at Telegram's 200 characters", async () => {
    const fetchMock = stubFetch(async () => ok(true));
    await createTelegramClient(TOKEN).answerCallbackQuery("q1", { text: "x".repeat(300), showAlert: true });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
    expect(body).toEqual({ callback_query_id: "q1", text: "x".repeat(200), show_alert: true });
  });

  it("sends setWebhook / setMyCommands parameters in Bot API names", async () => {
    const fetchMock = stubFetch(async () => ok(true));
    const tg = createTelegramClient(TOKEN);
    await tg.setWebhook({
      url: "https://sakai.example/api/telegram/webhook",
      secretToken: "s3cret",
      allowedUpdates: ["message", "callback_query"],
      dropPendingUpdates: true,
    });
    await tg.setMyCommands([{ command: "orders", description: "Orders" }], { scope: { type: "chat", chat_id: "1001" } });
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init!.body)));
    expect(bodies[0]).toEqual({
      url: "https://sakai.example/api/telegram/webhook",
      secret_token: "s3cret",
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    expect(bodies[1]).toEqual({
      commands: [{ command: "orders", description: "Orders" }],
      scope: { type: "chat", chat_id: "1001" },
    });
  });
});
