import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * GET /api/health — liveness + database check for the Docker HEALTHCHECK,
 * load balancers and uptime monitors (UptimeRobot, Better Stack…).
 * 200 { ok: true, db: "ok" } or 503 { ok: false, db: "down" }. Reveals nothing
 * else about the deployment.
 */
export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 3000;

export async function GET() {
  let dbOk = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS);
      }),
    ]);
    dbOk = true;
  } catch (err) {
    console.error("[api/health] database check failed", err);
  } finally {
    clearTimeout(timer);
  }
  return Response.json(
    { ok: dbOk, db: dbOk ? "ok" : "down" },
    { status: dbOk ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
