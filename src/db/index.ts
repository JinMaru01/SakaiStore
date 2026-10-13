import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __sakaiPool?: Pool };

function createPool() {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://sakai:sakai@localhost:5432/sakaistore",
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Managed Postgres (Neon, Supabase, RDS) needs TLS; local docker does not.
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

// Reuse one pool across hot reloads in dev. pg does not connect until the
// first query, so importing this module at build time is safe.
export const pool = globalForDb.__sakaiPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__sakaiPool = pool;

export const db: Database = drizzle(pool, { schema });
export { schema };
