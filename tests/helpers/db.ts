import { sql } from "drizzle-orm";
import { db } from "@/db";
import { seed } from "../../scripts/seed";

/**
 * Integration-test helpers. Usage:
 *   beforeEach(async () => { await resetDb(); await seedCatalog(); });
 * The test DB URL comes from vitest.config.ts (sakaistore_test).
 */
export async function resetDb() {
  await db.execute(
    sql`TRUNCATE order_events, orders, packages, games, promo_codes, settings RESTART IDENTITY CASCADE`,
  );
}

export async function seedCatalog() {
  await seed(db);
}
