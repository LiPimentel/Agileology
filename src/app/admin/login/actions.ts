"use server";

import { redirect } from "next/navigation";
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
import { rateLimit } from "@/lib/rateLimit";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email y contraseña son requeridos." };

  if (!rateLimit(`login:${email}`, 10, 60_000)) {
    return { error: "Demasiados intentos. Intenta de nuevo en un minuto." };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  // Constant response shape whether or not the account exists, to avoid
  // leaking which emails have accounts.
  if (!admin) {
    return { error: "Credenciales inválidas." };
  }

  if (await isLockedOut(admin)) {
    return { error: "Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta más tarde." };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    await recordFailedLogin(admin.id);
    await logAudit({ action: "login_failed", entityType: "Admin", entityId: admin.id });
    return { error: "Credenciales inválidas." };
  }

  if (admin.twoFactorEnabled) {
    await createPendingTwoFactor(admin.id);
    redirect("/admin/login/2fa");
  }

  await resetFailedLogins(admin.id);
  await createSession(admin.id);
  await logAudit({ adminId: admin.id, action: "login", entityType: "Admin", entityId: admin.id });
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

  const ok = verifyTwoFactorToken(admin.twoFactorSecret, token);
  if (!ok) {
    await recordFailedLogin(admin.id);
    return { error: "Código incorrecto." };
  }

  await resetFailedLogins(admin.id);
  await createSession(admin.id);
  await logAudit({ adminId: admin.id, action: "login", entityType: "Admin", entityId: admin.id });
  redirect("/admin");
}
