"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  isLockedOut,
  recordFailedLogin,
  resetFailedLogins,
  createPendingTwoFactor,
  consumePendingTwoFactor,
  createSession,
  verifyTwoFactorToken,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { rateLimit, seenRecently } from "@/lib/rateLimit";
import { clientIp } from "@/lib/clientIp";

export type LoginState = { error?: string };

// Checked when the email has no account, so a missing account takes as long to answer as a wrong
// password (bcrypt is deliberately slow): response time must not reveal which emails exist.
const DUMMY_HASH = "$2b$12$Wfhw1wdgTUPbG1am2k2STepDidDoMgWKMe1IqhXXYsvQ7yHaCPFE.";
const BAD_CREDENTIALS = "Credenciales inválidas, o cuenta bloqueada temporalmente.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email y contraseña son requeridos." };

  const ip = clientIp(await headers());
  // Two independent limits: per email (stops guessing one account) and per IP (stops one source
  // trying many emails, which the per-email limit alone cannot see).
  if (!rateLimit(`login:${email}`, 10, 60_000) || !rateLimit(`login-ip:${ip}`, 30, 10 * 60_000)) {
    return { error: "Demasiados intentos. Intenta de nuevo en unos minutos." };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  // Same answer, and about the same time, whether or not the account exists or is locked, to
  // avoid leaking which emails have accounts.
  if (!admin) {
    await verifyPassword(password, DUMMY_HASH);
    return { error: BAD_CREDENTIALS };
  }

  const locked = await isLockedOut(admin);
  const valid = await verifyPassword(password, admin.passwordHash);
  if (locked) return { error: BAD_CREDENTIALS };
  if (!valid) {
    await recordFailedLogin(admin.id);
    await logAudit({ action: "login_failed", entityType: "Admin", entityId: admin.id, detail: { summary: `Contraseña incorrecta desde ${ip}` } });
    return { error: BAD_CREDENTIALS };
  }

  if (admin.twoFactorEnabled) {
    await createPendingTwoFactor(admin.id);
    redirect("/admin/login/2fa");
  }

  await resetFailedLogins(admin.id);
  await createSession(admin.id);
  await logAudit({ adminId: admin.id, action: "login", entityType: "Admin", entityId: admin.id, detail: { summary: `Desde ${ip}` } });
  redirect("/admin/setup-2fa");
}

export type TwoFactorState = { error?: string };

export async function verifyLoginTwoFactor(_prev: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const token = String(formData.get("token") ?? "").trim();
  const adminId = await consumePendingTwoFactor();
  if (!adminId) return { error: "Sesión de verificación expirada. Inicia sesión de nuevo." };

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.twoFactorSecret) return { error: "Sesión de verificación inválida." };

  if (!rateLimit(`2fa:${adminId}`, 10, 60_000)) {
    return { error: "Demasiados intentos. Intenta de nuevo en un minuto." };
  }

  const ip = clientIp(await headers());
  const ok = verifyTwoFactorToken(admin.twoFactorSecret, token);
  // A code is good once: reusing one seen in the last 90 s (e.g. shoulder-surfed or intercepted) is refused.
  if (!ok || seenRecently(`totp:${admin.id}:${token}`, 90_000)) {
    await recordFailedLogin(admin.id);
    await logAudit({ action: "login_failed", entityType: "Admin", entityId: admin.id, detail: { summary: `Código 2FA incorrecto desde ${ip}` } });
    return { error: "Código incorrecto." };
  }

  await resetFailedLogins(admin.id);
  await createSession(admin.id);
  await logAudit({ adminId: admin.id, action: "login", entityType: "Admin", entityId: admin.id, detail: { summary: `Con 2FA, desde ${ip}` } });
  redirect("/admin");
}
