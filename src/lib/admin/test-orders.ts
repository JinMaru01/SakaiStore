import { db } from "@/db";
import { orders, type NewOrder, type Order } from "@/db/schema";

/**
 * Test-only factory for orders with arbitrary status/timestamps (bypasses the
 * order service on purpose so analytics edge cases are easy to set up).
 * Imported by *.test.ts files only.
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
let seq = 0;

function nextCode(): string {
  let n = ++seq;
  let out = "";
  for (let i = 0; i < 8; i++) {
    out = ALPHABET[n % ALPHABET.length] + out;
    n = Math.floor(n / ALPHABET.length);
  }
  return `SK${out}`;
}

export async function insertTestOrder(over: Partial<NewOrder> = {}): Promise<Order> {
  const [row] = await db
    .insert(orders)
    .values({
      code: nextCode(),
      status: "pending_payment",
      gameSlug: "mobile-legends",
      gameName: "Mobile Legends: Bang Bang",
      packageName: "86 Diamonds",
      playerId: "123456789",
      zoneId: "1234",
      unitPriceCents: 150,
      totalCents: 150,
      channel: "direct",
      ...over,
    })
    .returning();
  return row!;
}
