import { createHash } from "node:crypto";
import { BakongKHQR } from "bakong-khqr";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { buildKhqr, DEMO_BAKONG_ACCOUNT_ID, KhqrError } from "./khqr";

const inFifteen = () => new Date(Date.now() + 15 * 60_000);

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
});

describe("buildKhqr", () => {
  it("builds a valid dynamic USD KHQR with the order amount and bill number", () => {
    const expiresAt = inFifteen();
    const { qr, md5 } = buildKhqr({ amountCents: 150, billNumber: "SKABCDEFGH", expiresAt });

    expect(BakongKHQR.verify(qr).isValid).toBe(true);
    expect(md5).toBe(createHash("md5").update(qr).digest("hex"));

    const decoded = BakongKHQR.decode(qr).data!;
    expect(Number(decoded.transactionAmount)).toBe(1.5);
    expect(decoded.transactionCurrency).toBe("840");
    expect(decoded.billNumber).toBe("SKABCDEFGH");
    expect(decoded.bakongAccountID).toBe("sakai_test@aclb");
    expect(decoded.merchantName).toBe("Sakai Store");
    expect(decoded.pointofInitiationMethod).toBe("12"); // dynamic QR
    expect(Number(decoded.expirationTimestamp)).toBe(expiresAt.getTime());
  });

  it("encodes amounts exactly for every cent value", () => {
    for (const cents of [1, 7, 10, 25, 99, 100, 145, 1999, 2300, 14200, 1234567]) {
      const { qr } = buildKhqr({ amountCents: cents, billNumber: "SK2345", expiresAt: inFifteen() });
      expect(BakongKHQR.verify(qr).isValid).toBe(true);
      expect(Math.round(Number(BakongKHQR.decode(qr).data!.transactionAmount) * 100)).toBe(cents);
    }
  });

  it("uses a demo account in mock mode when none is configured", () => {
    vi.stubEnv("BAKONG_ACCOUNT_ID", "");
    resetEnvCache();
    const { qr } = buildKhqr({ amountCents: 100, billNumber: "SKDEMO", expiresAt: inFifteen() });
    expect(BakongKHQR.decode(qr).data!.bakongAccountID).toBe(DEMO_BAKONG_ACCOUNT_ID);
    expect(BakongKHQR.verify(qr).isValid).toBe(true);
  });

  it("truncates a long merchant name to the KHQR limit", () => {
    vi.stubEnv("BAKONG_MERCHANT_NAME", "Sakai Store Game Top Up Cambodia Official");
    resetEnvCache();
    const { qr } = buildKhqr({ amountCents: 100, billNumber: "SKX", expiresAt: inFifteen() });
    expect(BakongKHQR.decode(qr).data!.merchantName).toHaveLength(25);
  });

  it("throws clear errors for bad input or config", () => {
    expect(() => buildKhqr({ amountCents: 0, billNumber: "SKX", expiresAt: inFifteen() })).toThrow(KhqrError);
    expect(() => buildKhqr({ amountCents: 1.5, billNumber: "SKX", expiresAt: inFifteen() })).toThrow(KhqrError);
    expect(() => buildKhqr({ amountCents: 100, billNumber: "SKX", expiresAt: new Date(Date.now() - 1000) })).toThrow(
      /future/,
    );

    vi.stubEnv("PAYMENT_MODE", "bakong");
    vi.stubEnv("BAKONG_ACCOUNT_ID", "");
    resetEnvCache();
    expect(() => buildKhqr({ amountCents: 100, billNumber: "SKX", expiresAt: inFifteen() })).toThrow(
      /BAKONG_ACCOUNT_ID/,
    );

    vi.stubEnv("BAKONG_ACCOUNT_ID", "not-a-bakong-id");
    resetEnvCache();
    expect(() => buildKhqr({ amountCents: 100, billNumber: "SKX", expiresAt: inFifteen() })).toThrow(
      /Bakong Account ID is invalid/,
    );
  });
});
