import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Optimistic gate for the backoffice (RF-01, RF-03). This only checks
 * whether a session cookie is present — it does NOT verify the session
 * against the database (Proxy/Middleware should not carry full auth logic).
 * The real, authoritative check is `requireAdmin()` in `src/app/admin/layout.tsx`
 * and in every server action, which is what actually protects data access.
 *
 * Also supports a real `admin.<domain>` subdomain (PRD section 5) by
 * rewriting it to the `/admin` path, while still allowing direct `/admin`
 * access for local development or until the subdomain DNS is configured.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const isAdminHost = host.startsWith("admin.");

  if (isAdminHost && !pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const hasSession = request.cookies.has(SESSION_COOKIE);
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Runs broadly so the admin.<domain> subdomain rewrite works for any path
  // (e.g. "/"), not just paths already starting with "/admin".
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
