/**
 * Minimal typings for the `bakong-khqr` SDK (plain CommonJS, ships no types).
 * Only the parts used by src/lib/payments/khqr.ts and its tests are declared;
 * see node_modules/bakong-khqr/src/index.js for the source of truth.
 */
declare module "bakong-khqr" {
  export const khqrData: {
    currency: { usd: 840; khr: 116 };
    merchantType: { merchant: "merchant"; individual: "individual" };
  };

  export type KHQRStatus = {
    /** 0 = success, 1 = error. */
    code: 0 | 1;
    errorCode: number | null;
    message: string | null;
  };

  export type KHQRResponse<T> = { status: KHQRStatus; data: T | null };

  export type IndividualOptional = {
    currency?: number;
    amount?: number | string;
    billNumber?: string;
    mobileNumber?: string;
    storeLabel?: string;
    terminalLabel?: string;
    purposeOfTransaction?: string;
    accountInformation?: string;
    acquiringBank?: string;
    languagePreference?: string;
    merchantNameAlternateLanguage?: string;
    merchantCityAlternateLanguage?: string;
    upiMerchantAccount?: string;
    /** 13-digit epoch milliseconds; required for QR codes with an amount. */
    expirationTimestamp?: number;
    merchantCategoryCode?: string;
  };

  export class IndividualInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      optional?: IndividualOptional,
    );
  }

  export type DecodedKHQR = {
    merchantType: string | null;
    bakongAccountID: string | null;
    billNumber: string | null;
    transactionCurrency: string | null;
    transactionAmount: string | null;
    merchantName: string | null;
    merchantCity: string | null;
    creationTimestamp: string | null;
    expirationTimestamp: string | null;
    crc: string | null;
    [key: string]: string | null;
  };

  export class BakongKHQR {
    generateIndividual(info: IndividualInfo): KHQRResponse<{ qr: string; md5: string }>;
    static verify(qr: string): { isValid: boolean };
    static decode(qr: string): KHQRResponse<DecodedKHQR>;
  }
}
