import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHmac, createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MINUTES, sessionCookieOptions } from "@/lib/session-db";

export { SESSION_COOKIE, touchSession } from "@/lib/session-db";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const TOTP_ISSUER = "Agileology Wave";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(adminId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60_000);
  await prisma.session.create({ data: { id: token, adminId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.delete({ where: { id: token } }).catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

/**
 * Full session verification: looks up the session server-side and enforces
 * the inactivity timeout (RF-03). Read-only (no cookie mutation, which is
 * illegal during a Server Component render) — the sliding-expiry refresh
 * happens in proxy.ts via touchSession(). This must be called by every
 * admin page/action; proxy.ts only does an optimistic cookie-presence check.
 */
export async function getCurrentAdmin() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { admin: true },
  });

  if (!session || session.expiresAt < new Date()) return null;

  return session.admin;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function isLockedOut(admin: { lockoutUntil: Date | null }) {
  return !!admin.lockoutUntil && admin.lockoutUntil > new Date();
}

export async function recordFailedLogin(adminId: string) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) return;
  const attempts = admin.failedLoginAttempts + 1;
  const data: { failedLoginAttempts: number; lockoutUntil?: Date } = {
    failedLoginAttempts: attempts,
  };
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    data.lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
  }
  await prisma.admin.update({ where: { id: adminId }, data });
}

export async function resetFailedLogins(adminId: string) {
  await prisma.admin.update({
    where: { id: adminId },
    data: { failedLoginAttempts: 0, lockoutUntil: null, lastLoginAt: new Date() },
  });
}

const RESET_TOKEN_HOURS = 1;

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** RF-02: password reset via the admin's registered email. */
export async function createPasswordResetToken(email: string) {
  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin) return null;
  const raw = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      adminId: admin.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + RESET_TOKEN_HOURS * 3_600_000),
    },
  });
  return raw;
}

export async function consumePasswordResetToken(raw: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.adminId;
}

export function generateTwoFactorSecret(email: string) {
  const secret = new Secret({ size: 20 });
  return { base32: secret.base32, otpauthUrl: buildOtpauthUrl(email, secret.base32) };
}

export function buildOtpauthUrl(email: string, base32Secret: string) {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(base32Secret),
  });
  return totp.toString();
}

export async function twoFactorQrDataUrl(otpauthUrl: string) {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTwoFactorToken(base32Secret: string, token: string) {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(base32Secret),
  });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

const PENDING_2FA_COOKIE = "agileology_pending_2fa";
const PENDING_2FA_MINUTES = 5;

function sign(value: string) {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Short-lived signed cookie bridging "password OK" -> "2FA verified" during login (RS-03). */
export async function createPendingTwoFactor(adminId: string) {
  const expires = Date.now() + PENDING_2FA_MINUTES * 60_000;
  const payload = `${adminId}.${expires}`;
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(PENDING_2FA_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_2FA_MINUTES * 60,
  });
}

export async function consumePendingTwoFactor(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(PENDING_2FA_COOKIE)?.value;
  store.delete(PENDING_2FA_COOKIE);
  if (!raw) return null;
  const [adminId, expiresStr, signature] = raw.split(".");
  if (!adminId || !expiresStr || !signature) return null;
  const expected = sign(`${adminId}.${expiresStr}`);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  if (Number(expiresStr) < Date.now()) return null;
  return adminId;
}
