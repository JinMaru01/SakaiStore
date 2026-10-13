import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Migrate the test database once before the test run. */
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? "postgresql://sakai:sakai@localhost:5432/sakaistore_test";
  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  } catch (err) {
    console.warn(
      `[vitest] Could not migrate test database (${url}). DB integration tests will fail.\n`,
      (err as Error).message,
    );
  } finally {
    await pool.end();
  }
}
