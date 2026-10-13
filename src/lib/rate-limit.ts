/**
 * Tiny in-memory fixed-window rate limiter. Per server instance only — good
 * enough to blunt abuse on a single VM / warm serverless instance. Swap for
 * Redis/Upstash if you scale horizontally.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  const ok = b.count <= limit;
  return { ok, remaining: Math.max(0, limit - b.count), retryAfterMs: ok ? 0 : b.resetAt - now };
}

export function resetRateLimits() {
  buckets.clear();
}
