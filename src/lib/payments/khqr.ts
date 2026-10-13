import "server-only";
import { BakongKHQR, IndividualInfo, khqrData } from "bakong-khqr";
import { env } from "@/lib/env";

/**
 * KHQR generation (Bakong / NBC standard, accepted by ABA, ACLEDA, Wing and
 * every Bakong member app). We generate a *dynamic* individual KHQR in USD
 * with the exact order total, the order code as bill number and an expiry,
 * so the customer cannot change the amount and the md5 of the string
 * identifies the payment when we ask Bakong whether it was paid.
 */

/** Used in PAYMENT_MODE=mock when no BAKONG_ACCOUNT_ID is configured. */
export const DEMO_BAKONG_ACCOUNT_ID = "sakaistore@demo";

// Field limits from the KHQR spec (see bakong-khqr src/constant/index.js).
const MAX_MERCHANT_NAME = 25;
const MAX_MERCHANT_CITY = 15;
const MAX_BILL_NUMBER = 25;

export class KhqrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KhqrError";
  }
}

export type BuildKhqrInput = {
  amountCents: number;
  /** Shown in the banking app and on the bank statement; we use the order code. */
  billNumber: string;
  expiresAt: Date;
};

export type BuiltKhqr = { qr: string; md5: string };

function accountId(): string {
  const e = env();
  if (e.BAKONG_ACCOUNT_ID) return e.BAKONG_ACCOUNT_ID;
  if (e.PAYMENT_MODE === "mock") return DEMO_BAKONG_ACCOUNT_ID;
  throw new KhqrError("BAKONG_ACCOUNT_ID is not set (required when PAYMENT_MODE=bakong)");
}

/** Build a USD dynamic KHQR. Throws KhqrError with a clear message on bad config/input. */
export function buildKhqr({ amountCents, billNumber, expiresAt }: BuildKhqrInput): BuiltKhqr {
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new KhqrError(`Invalid KHQR amount: ${amountCents} cents`);
  }
  const expirationTimestamp = expiresAt.getTime();
  if (!Number.isFinite(expirationTimestamp) || expirationTimestamp <= Date.now()) {
    throw new KhqrError("KHQR expiry must be in the future");
  }
  const { BAKONG_MERCHANT_NAME, BAKONG_MERCHANT_CITY } = env();

  let result: ReturnType<BakongKHQR["generateIndividual"]>;
  try {
    const info = new IndividualInfo(
      accountId(),
      BAKONG_MERCHANT_NAME.trim().slice(0, MAX_MERCHANT_NAME),
      BAKONG_MERCHANT_CITY.trim().slice(0, MAX_MERCHANT_CITY),
      {
        currency: khqrData.currency.usd,
        // Integer cents / 100 always stringifies with ≤ 2 decimals (1.5, 0.25, 10).
        amount: amountCents / 100,
        billNumber: billNumber.slice(0, MAX_BILL_NUMBER),
        expirationTimestamp,
      },
    );
    result = new BakongKHQR().generateIndividual(info);
  } catch (err) {
    if (err instanceof KhqrError) throw err;
    // The SDK throws plain strings for some argument errors.
    throw new KhqrError(`KHQR generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!result || result.status?.code !== 0 || !result.data?.qr || !result.data.md5) {
    const reason = result?.status?.message ?? "unknown error";
    const code = result?.status?.errorCode;
    throw new KhqrError(`KHQR generation failed: ${reason}${code != null ? ` (code ${code})` : ""}`);
  }
  return { qr: result.data.qr, md5: result.data.md5 };
}
