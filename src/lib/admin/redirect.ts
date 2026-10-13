/**
 * Post-login redirect target. Only same-site /admin paths are allowed so a
 * crafted link like /admin/login?next=https://evil.example (or //evil, /\evil)
 * cannot bounce the owner to a phishing page after they sign in.
 * Pure; safe for server and client.
 */

export const ADMIN_HOME = "/admin";
const LOGIN_PATH = "/admin/login";
const BASE = "http://admin.invalid";

export function safeAdminNext(next: unknown): string {
  if (typeof next !== "string") return ADMIN_HOME;
  const raw = next.trim();
  // Must be a plain absolute path: no scheme, no protocol-relative //, no backslashes or control chars.
  if (!raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(raw)) return ADMIN_HOME;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return ADMIN_HOME;
  }
  if (url.origin !== BASE) return ADMIN_HOME;
  const path = url.pathname;
  if (path !== ADMIN_HOME && !path.startsWith(`${ADMIN_HOME}/`)) return ADMIN_HOME;
  if (path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}/`)) return ADMIN_HOME;
  return `${path}${url.search}${url.hash}`;
}
