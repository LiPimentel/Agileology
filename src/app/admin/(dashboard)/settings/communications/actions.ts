"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type CommsState = { error?: string; success?: boolean };

export async function updateCommunicationSettings(_prev: CommsState, formData: FormData): Promise<CommsState> {
  const admin = await requireAdmin();
  const chatDestinationEmail = String(formData.get("chatDestinationEmail") ?? "").trim();
  const contactFormDestinationEmail = String(formData.get("contactFormDestinationEmail") ?? "").trim();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRe.test(chatDestinationEmail) || !emailRe.test(contactFormDestinationEmail)) {
    return { error: "Ingresa direcciones de email válidas." };
  }

  await prisma.communicationSettings.upsert({
    where: { id: "singleton" },
    update: { chatDestinationEmail, contactFormDestinationEmail },
    create: { id: "singleton", chatDestinationEmail, contactFormDestinationEmail },
  });

  await logAudit({ adminId: admin.id, action: "update_communication_settings", entityType: "CommunicationSettings", entityId: "singleton" });
  revalidatePath("/admin/settings/communications");
  return { success: true };
}
