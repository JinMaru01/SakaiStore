/**
 * Whitelisted one-shot messages shown after a redirect (?flash=<code>).
 * Only known codes render, so a crafted link cannot put arbitrary text on an
 * admin page. Pure; safe for server and client.
 */
const FLASH_MESSAGES = {
  game_created: "Game created. Add its packages below, then save.",
  game_deleted: "Game deleted.",
  promo_created: "Promo code created.",
  promo_deleted: "Promo code deleted.",
  signed_out: "You have been signed out.",
} as const;

export type FlashCode = keyof typeof FLASH_MESSAGES;

export function flashMessage(code: unknown): string | null {
  const key = Array.isArray(code) ? code[0] : code;
  return typeof key === "string" && Object.hasOwn(FLASH_MESSAGES, key) ? FLASH_MESSAGES[key as FlashCode] : null;
}
