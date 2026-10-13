import "server-only";
import { randomInt } from "node:crypto";

/**
 * Public order codes: "SK" + 8 characters, e.g. "SK7F3K9Q2M". The alphabet
 * leaves out 0/O and 1/I/L so codes survive being read aloud, typed from a
 * screenshot or copied from a Telegram message. 31^8 ≈ 8.5e11 combinations
 * make codes impractical to guess (they act as the customer's access token
 * for the order page), and the endpoints that take a code are rate-limited.
 */
export const ORDER_CODE_PREFIX = "SK";
export const ORDER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ORDER_CODE_RANDOM_LENGTH = 8;

const CODE_RE = new RegExp(
  `^${ORDER_CODE_PREFIX}[${ORDER_CODE_ALPHABET}]{${ORDER_CODE_RANDOM_LENGTH}}$`,
);

/** Cryptographically random order code. Uniqueness is enforced by the DB (createOrder retries). */
export function generateOrderCode(): string {
  let out = ORDER_CODE_PREFIX;
  for (let i = 0; i < ORDER_CODE_RANDOM_LENGTH; i++) {
    out += ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Normalize user input ("sk7f3k9q2m ", "#SK7F3K9Q2M") to a canonical code, or
 * null when it cannot be an order code (lets routes skip the DB lookup).
 */
export function normalizeOrderCode(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().replace(/^#/, "").toUpperCase();
  return CODE_RE.test(code) ? code : null;
}
