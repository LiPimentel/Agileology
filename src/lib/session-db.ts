// No "next/headers" / "server-only" imports here on purpose — this module
// is safe to import from proxy.ts (Node.js runtime, but not the
// cookies()-in-render context that Server Components use).
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "agileology_session";

// `NODE_ENV === "production"` used to gate the cookie's `Secure` attribute,
// but a production Docker build accessed over plain HTTP (Tailscale/LAN
// without TLS in front of it — a normal setup while testing before a
// reverse proxy/tunnel is in place) means browsers silently refuse to ever
// send that cookie back, since `Secure` requires an HTTPS connection. That
// looked exactly like a broken session: login succeeds, the page renders
// once, then every subsequent request has no cookie at all.
// Default to secure (safe for the real deployment); set COOKIE_SECURE=false
// explicitly to disable it for local/plain-HTTP testing.
export const COOKIE_SECURE = process.env.COOKIE_SECURE !== "false";

// `??` only falls back on null/undefined, not on an empty string — an env
// var present-but-empty (e.g. "SESSION_INACTIVITY_MINUTES=" in a .env file)
// would otherwise silently yield Number("") === 0, expiring every session
// almost immediately. Guard against that and against non-numeric garbage.
function parseSessionMinutes(raw: string | undefined) {
  const n = Number(raw);
  return raw && Number.isFinite(n) && n > 0 ? n : 30;
}
export const SESSION_MINUTES = parseSessionMinutes(process.env.SESSION_INACTIVITY_MINUTES);

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Slides the session's inactivity timeout forward (RF-03). Called from proxy.ts. */
export async function touchSession(token: string) {
  const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60_000);
  try {
    await prisma.session.update({ where: { id: token }, data: { expiresAt, lastSeenAt: new Date() } });
  } catch (err) {
    // Never swallow this silently — a session that fails to slide (missing
    // row vs. a real DB error look identical downstream otherwise) has
    // bitten us before. Log the token prefix only (not the full session
    // token) so this is traceable in `docker compose logs` without leaking
    // a usable credential into the log.
    console.error(
      `[touchSession] failed to refresh session ${token.slice(0, 8)}…:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
  return expiresAt;
}
