import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { checkTransactionByMd5 } from "./bakong";
import { checkPayment, createPayment } from "./index";

const MD5 = "0123456789abcdef0123456789abcdef";

const paidBody = (overrides: Record<string, unknown> = {}) => ({
  responseCode: 0,
  responseMessage: "Getting transaction successfully.",
  errorCode: null,
  data: {
    hash: "a1b2c3d4e5f6",
    fromAccountId: "customer@abaa",
    toAccountId: "sakai_test@aclb",
    currency: "USD",
    amount: 1.5,
    externalRef: "100FT123",
    ...overrides,
  },
});

const notFoundBody = {
  responseCode: 1,
  responseMessage: "Transaction could not be found. Please check and try again.",
  errorCode: 1,
  data: null,
};

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const respond = (body: unknown, status = 200) => async () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.stubEnv("BAKONG_API_TOKEN", "test-token");
  vi.stubEnv("BAKONG_API_BASE", "https://bakong.example/");
  resetEnvCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvCache();
});

describe("checkTransactionByMd5", () => {
  it("reports a paid transaction and sends the right request", async () => {
    const fetchFn = mockFetch(respond(paidBody()));
    const result = await checkTransactionByMd5(MD5);
    expect(result).toMatchObject({
      status: "paid",
      ref: "a1b2c3d4e5f6",
      amount: 1.5,
      currency: "USD",
      toAccountId: "sakai_test@aclb",
    });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://bakong.example/v1/check_transaction_by_md5");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-token");
    expect(JSON.parse(String(init.body))).toEqual({ md5: MD5 });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("reports unpaid when Bakong cannot find the transaction", async () => {
    mockFetch(respond(notFoundBody));
    expect(await checkTransactionByMd5(MD5)).toEqual({ status: "unpaid" });
  });

  it("reports an expired token (HTTP 401) as an error", async () => {
    mockFetch(respond({ message: "Unauthorized" }, 401));
    const result = await checkTransactionByMd5(MD5);
    expect(result.status).toBe("error");
    expect(result).toMatchObject({ message: expect.stringMatching(/401/) });
  });

  it("times out instead of hanging", async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
        }),
    );
    const result = await checkTransactionByMd5(MD5, { timeoutMs: 30 });
    expect(result).toEqual({ status: "error", message: "Bakong API timed out" });
  });

  it("handles network failures, bad JSON and unknown error codes", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    expect((await checkTransactionByMd5(MD5)).status).toBe("error");

    mockFetch(async () => new Response("<html>", { status: 200 }));
    expect(await checkTransactionByMd5(MD5)).toEqual({ status: "error", message: "Bakong API returned invalid JSON" });

    mockFetch(respond({ responseCode: 1, errorCode: 6, responseMessage: "Unauthorized", data: null }));
    expect((await checkTransactionByMd5(MD5)).status).toBe("error");

    mockFetch(respond({}, 500));
    expect(await checkTransactionByMd5(MD5)).toEqual({ status: "error", message: "Bakong API HTTP 500" });
  });

  it("does not call the API without a token or with a bad md5", async () => {
    const fetchFn = mockFetch(respond(paidBody()));
    expect((await checkTransactionByMd5("not-an-md5")).status).toBe("error");
    vi.stubEnv("BAKONG_API_TOKEN", "");
    resetEnvCache();
    expect(await checkTransactionByMd5(MD5)).toEqual({ status: "error", message: "BAKONG_API_TOKEN is not set" });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("checkPayment (provider facade)", () => {
  const order = { code: "SKTEST2345", khqrMd5: MD5, totalCents: 150, currency: "USD" };

  it("never polls anything in mock mode", async () => {
    const fetchFn = mockFetch(respond(paidBody()));
    expect(await checkPayment(order)).toEqual({ status: "unpaid" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  describe("bakong mode", () => {
    beforeEach(() => {
      vi.stubEnv("PAYMENT_MODE", "bakong");
      resetEnvCache();
      vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => vi.restoreAllMocks());

    it("accepts a payment that matches the order exactly", async () => {
      mockFetch(respond(paidBody()));
      expect(await checkPayment(order)).toMatchObject({ status: "paid", ref: "a1b2c3d4e5f6" });
    });

    it("rejects an amount mismatch", async () => {
      mockFetch(respond(paidBody({ amount: 1.0 })));
      const result = await checkPayment(order);
      expect(result.status).toBe("error");
      expect(result).toMatchObject({ message: expect.stringMatching(/mismatch/i) });
    });

    it("rejects a currency mismatch", async () => {
      mockFetch(respond(paidBody({ currency: "KHR", amount: 150 })));
      expect((await checkPayment({ ...order, totalCents: 15000 })).status).toBe("error");
    });

    it("rejects a payment to another account", async () => {
      mockFetch(respond(paidBody({ toAccountId: "someone@else" })));
      expect((await checkPayment(order)).status).toBe("error");
    });

    it("passes through unpaid and errors", async () => {
      mockFetch(respond(notFoundBody));
      expect(await checkPayment(order)).toEqual({ status: "unpaid" });
      expect((await checkPayment({ ...order, khqrMd5: null })).status).toBe("error");
    });
  });
});

describe("createPayment", () => {
  it("expires after PAYMENT_TIMEOUT_MINUTES", () => {
    const now = new Date();
    const payment = createPayment({ code: "SKTEST2345", totalCents: 250, now });
    expect(payment.expiresAt.getTime() - now.getTime()).toBe(15 * 60_000);
    expect(payment.md5).toMatch(/^[a-f0-9]{32}$/);
    expect(payment.khqr).toContain("SKTEST2345");
  });
});
