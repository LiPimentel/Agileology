// No "next/headers" / "server-only" imports here on purpose — this module
// is safe to import from proxy.ts (Node.js runtime, but not the
// cookies()-in-render context that Server Components use).
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "agileology_session";

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
    secure: process.env.NODE_ENV === "production",
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
