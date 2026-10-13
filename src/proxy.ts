import { NextResponse, type NextRequest } from "next/server";

/**
 * UX-only redirect for signed-out admin page visits: /admin/orders/<id>
 * (e.g. opened from a Telegram alert) → /admin/login?next=/admin/orders/<id>,
 * so the owner lands back on that order after signing in.
 *
 * This is NOT the auth check — every admin page, action and route still calls
 * requireAdmin()/requireAdminApi(). The matcher only runs this when the
 * session cookie is missing at all (an expired session's cookie is dropped by
 * the browser at the same time, see src/lib/auth.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return NextResponse.next();
  // Only full page loads. Client-side navigations (RSC fetches), server actions
  // and the CSV export keep their normal behaviour (requireAdmin / 401).
  const isDocument =
    request.method === "GET" &&
    !request.headers.has("rsc") &&
    (request.headers.get("accept") ?? "").includes("text/html");
  if (!isDocument) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  // /admin itself is the default after sign-in; keep the URL clean.
  if (pathname !== "/admin") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    {
      source: "/admin/:path*",
      // Must match ADMIN_COOKIE in src/lib/auth.ts (not imported: proxy is bundled separately).
      missing: [{ type: "cookie", key: "sk_admin" }],
    },
  ],
};
