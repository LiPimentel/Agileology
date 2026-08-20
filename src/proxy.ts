import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, touchSession, sessionCookieOptions } from "@/lib/session-db";

/**
 * Gates the backoffice (RF-01, RF-03) and slides the session's inactivity
 * timeout forward. Proxy is the only place outside a Server Action/Route
 * Handler allowed to mutate cookies, so the sliding-expiry refresh lives
 * here rather than in a Server Component render. The authoritative
 * per-request authorization check still happens in `requireAdmin()`
 * (src/lib/auth.ts), called from every admin page and server action.
 *
 * Also supports a real `admin.<domain>` subdomain (PRD section 5) by
 * rewriting it to the `/admin` path, while still allowing direct `/admin`
 * access for local development or until the subdomain DNS is configured.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const isAdminHost = host.startsWith("admin.");

  if (isAdminHost && !pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const expiresAt = await touchSession(token);
    if (!expiresAt) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      const res = NextResponse.redirect(url);
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  // Runs broadly so the admin.<domain> subdomain rewrite works for any path
  // (e.g. "/"), not just paths already starting with "/admin".
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
