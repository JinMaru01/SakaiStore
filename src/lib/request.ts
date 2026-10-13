import "server-only";
import { createHash } from "node:crypto";
import { env } from "./env";

/** Best-effort client IP from proxy headers. */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "0.0.0.0";
}

/** Privacy-preserving IP hash (salted with AUTH_SECRET) for abuse tracking. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${env().AUTH_SECRET}:${ip}`).digest("hex").slice(0, 32);
}
