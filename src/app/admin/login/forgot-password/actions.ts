"use server";

import { createPasswordResetToken, hashPassword, consumePasswordResetToken } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";

export type RequestResetState = { message?: string; error?: string };

export async function requestPasswordReset(_prev: RequestResetState, formData: FormData): Promise<RequestResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Ingresa tu email." };

  if (!rateLimit(`reset:${email}`, 5, 15 * 60_000)) {
    return { message: "Si el email existe, se envió un enlace de recuperación." };
  }

  const token = await createPasswordResetToken(email);
  if (token) {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/login/reset-password/${token}`;
    await sendMail({
      to: email,
      subject: "Restablecer contraseña — Agileology Wave Backoffice",
      text: `Solicitaste restablecer tu contraseña. Este enlace expira en 1 hora:\n\n${url}\n\nSi no fuiste tú, ignora este mensaje.`,
    });
  }

  // Same message whether or not the account exists, to avoid leaking which emails have accounts.
  return { message: "Si el email existe, se envió un enlace de recuperación." };
}

export type ResetPasswordState = { error?: string; success?: boolean };

export async function resetPassword(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const adminId = await consumePasswordResetToken(token);
  if (!adminId) return { error: "El enlace es inválido o ya expiró." };

  const passwordHash = await hashPassword(password);
  await prisma.admin.update({
    where: { id: adminId },
    data: { passwordHash, failedLoginAttempts: 0, lockoutUntil: null },
  });
  await logAudit({ adminId, action: "reset_password", entityType: "Admin", entityId: adminId });

  return { success: true };
}
