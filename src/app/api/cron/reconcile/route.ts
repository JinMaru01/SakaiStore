import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { errorJson, json } from "@/lib/orders/http";
import { expireStaleOrders, reconcilePendingPayments } from "@/lib/orders/service";

/**
 * GET|POST /api/cron/reconcile — run every minute or few (Vercel Cron, a VM
 * crontab with curl, or any uptime pinger):
 *   1. reconcile: catch payments nobody polled for (customer closed the tab),
 *      including late payments on recently expired orders;
 *   2. expire unpaid orders whose KHQR window closed.
 * Auth: `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET it only
 * runs outside production.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const digest = (s: string) => createHash("sha256").update(s).digest();

function isAuthorized(request: Request): boolean {
  const { CRON_SECRET, NODE_ENV } = env();
  if (!CRON_SECRET) return NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  return timingSafeEqual(digest(header), digest(`Bearer ${CRON_SECRET}`));
}

async function run(request: Request): Promise<Response> {
  if (!isAuthorized(request)) return errorJson("unauthorized", 401);
  try {
    // Reconcile first so a payment that just landed wins over expiry.
    const { checked, paid } = await reconcilePendingPayments();
    const expired = await expireStaleOrders();
    return json({ expired, checked, paid });
  } catch (err) {
    console.error("[api/cron/reconcile] failed", err);
    return errorJson("server_error", 500);
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
