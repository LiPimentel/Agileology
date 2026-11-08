import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, touchSession, sessionCookieOptions } from "@/lib/session-db";
import { findRedirect } from "@/lib/redirects";
import { canonicalRedirectTarget } from "@/lib/siteUrl";
import { getCanonicalConfig } from "@/lib/canonicalConfig";
import { buildCsp, HSTS_VALUE } from "@/lib/csp";

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
async function route(request: NextRequest, requestHeaders: Headers) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const isAdminHost = host.startsWith("admin.");

  // One official spelling of the domain (with or without www), chosen in /admin/settings/domain:
  // the other one is redirected (301) so search engines see a single site. Never for the backoffice.
  if ((request.method === "GET" || request.method === "HEAD") && !isAdminHost && !pathname.startsWith("/admin")) {
    const config = await getCanonicalConfig();
    if (config && config.canonicalHost !== "none") {
      const target = canonicalRedirectTarget({
        host: request.headers.get("x-forwarded-host") ?? host,
        pathname,
        search: request.nextUrl.search,
        publicUrl: config.publicUrl,
        canonicalHost: config.canonicalHost,
      });
      if (target) return NextResponse.redirect(target, 301);
    }
  }

  // Old Wix URLs -> new ones (permanent, 301). The table lives in src/data/redirects.ts.
  // GET/HEAD only, and never for the backoffice.
  if ((request.method === "GET" || request.method === "HEAD") && !isAdminHost && !pathname.startsWith("/admin")) {
    const target = findRedirect(pathname);
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url, 301);
    }
  }

  if (isAdminHost && !pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // This is an *optimistic* refresh, not the authoritative auth check
    // (Next.js's own guidance: Proxy "should not be used as a full session
    // management or authorization solution" — see docs/01-app/01-getting-started/16-proxy.md).
    // touchSession() does a real DB write on every admin request/action POST;
    // if it fails for any reason (transient DB error, connection pool
    // contention, etc.) that must NOT be treated as "session invalid" — doing
    // so previously deleted a perfectly valid session cookie and 307-redirected
    // in-flight Server Action POSTs (e.g. the 2FA-confirm submit) straight to
    // /admin/login before the action ever ran. On failure here we just pass
    // the request through unchanged; requireAdmin() (called by every admin
    // page/action) does its own independent, accurate DB lookup and is the
    // real authority on whether the session is valid.
    const expiresAt = await touchSession(token);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (expiresAt) {
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    }
    return res;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  // A fresh, unguessable value per request: scripts without it do not run (see lib/csp.ts).
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const https = request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";
  const csp = buildCsp(nonce, { https, dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = await route(request, requestHeaders);
  res.headers.set("Content-Security-Policy", csp);
  if (https) res.headers.set("Strict-Transport-Security", HSTS_VALUE);
  return res;
}

export const config = {
  // Runs broadly so the admin.<domain> subdomain rewrite works for any path
  // (e.g. "/"), not just paths already starting with "/admin".
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
