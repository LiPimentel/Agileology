"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, verifyTwoFactorToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type ConfirmState = { error?: string };

export async function confirmTwoFactorSetup(_prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  console.log("[confirmTwoFactorSetup] action invoked");
  const admin = await requireAdmin(); // throws/redirects here if the session isn't valid — see the [requireAdmin]/[getCurrentAdmin] logs for why
  const token = String(formData.get("token") ?? "").trim();

  const fresh = await prisma.admin.findUnique({ where: { id: admin.id } });
  if (!fresh?.twoFactorSecret) {
    console.warn(`[confirmTwoFactorSetup] admin ${admin.id} has no pending 2FA secret`);
    return { error: "No hay una configuración de 2FA pendiente." };
  }

  const ok = verifyTwoFactorToken(fresh.twoFactorSecret, token);
  if (!ok) return { error: "Código incorrecto. Intenta de nuevo." };

  await prisma.admin.update({ where: { id: admin.id }, data: { twoFactorEnabled: true } });
  await logAudit({ adminId: admin.id, action: "enable_2fa", entityType: "Admin", entityId: admin.id });
  console.log(`[confirmTwoFactorSetup] 2FA enabled for admin ${admin.id}, redirecting to /admin`);
  redirect("/admin");
}
