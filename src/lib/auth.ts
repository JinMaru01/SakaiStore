import "server-only";
import { timingSafeEqual, createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";

/**
 * Single-owner admin auth: the password is ADMIN_PASSWORD (env), the session
 * is an HS256 JWT in an httpOnly cookie signed with AUTH_SECRET.
 *
 * Use `requireAdmin()` at the top of every admin page/layout/server action and
 * `requireAdminApi()` in admin route handlers. Never rely on proxy.ts alone.
 */

export const ADMIN_COOKIE = "sk_admin";
const SESSION_DAYS = 7;
const ISSUER = "sakaistore";
const AUDIENCE = "admin";

export type AdminSession = { sub: "admin"; iat: number; exp: number };

const key = () => new TextEncoder().encode(env().AUTH_SECRET);

/** Constant-time password check. Returns false if ADMIN_PASSWORD is unset. */
export function verifyAdminPassword(input: string): boolean {
  const expected = env().ADMIN_PASSWORD;
  if (!expected) return false;
  // Hash both sides so lengths match for timingSafeEqual.
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function createAdminSession(): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function verifyAdminToken(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, audience: AUDIENCE });
    if (payload.sub !== "admin") return null;
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

/** For admin pages, layouts and server actions: redirects to /admin/login when signed out. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For admin route handlers: returns a 401 Response when signed out, else null. */
export async function requireAdminApi(): Promise<Response | null> {
  const session = await getAdminSession();
  if (session) return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
