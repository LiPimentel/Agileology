// No "next/headers" / "server-only" imports here on purpose — this module
// is safe to import from proxy.ts (Node.js runtime, but not the
// cookies()-in-render context that Server Components use).
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "agileology_session";
export const SESSION_MINUTES = Number(process.env.SESSION_INACTIVITY_MINUTES ?? 30);

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
  } catch {
    return null;
  }
  return expiresAt;
}
