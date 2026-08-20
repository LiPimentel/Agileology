"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sanitizePlainText } from "@/lib/sanitize";

export type CommsState = { error?: string; success?: boolean };

export async function updateCommunicationSettings(_prev: CommsState, formData: FormData): Promise<CommsState> {
  const admin = await requireAdmin();
  const chatDestinationEmail = String(formData.get("chatDestinationEmail") ?? "").trim();
  const contactFormDestinationEmail = String(formData.get("contactFormDestinationEmail") ?? "").trim();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRe.test(chatDestinationEmail) || !emailRe.test(contactFormDestinationEmail)) {
    return { error: "Ingresa direcciones de email válidas." };
  }

  const chatWidgetTitle = sanitizePlainText(String(formData.get("chatWidgetTitle") ?? "")).slice(0, 60);
  const chatWidgetButtonLabel = sanitizePlainText(String(formData.get("chatWidgetButtonLabel") ?? "")).slice(0, 60);
  const chatWidgetPlaceholder = sanitizePlainText(String(formData.get("chatWidgetPlaceholder") ?? "")).slice(0, 120);
  const chatWidgetSuccessMessage = sanitizePlainText(String(formData.get("chatWidgetSuccessMessage") ?? "")).slice(0, 200);
  if (!chatWidgetTitle || !chatWidgetButtonLabel || !chatWidgetPlaceholder || !chatWidgetSuccessMessage) {
    return { error: "Los textos del widget de chat no pueden quedar vacíos." };
  }

  const data = {
    chatDestinationEmail,
    contactFormDestinationEmail,
    chatWidgetTitle,
    chatWidgetButtonLabel,
    chatWidgetPlaceholder,
    chatWidgetSuccessMessage,
  };

  await prisma.communicationSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  await logAudit({ adminId: admin.id, action: "update_communication_settings", entityType: "CommunicationSettings", entityId: "singleton" });
  revalidatePath("/admin/settings/communications");
  // Chat widget texts render on every public page (PublicLayout).
  revalidatePath("/", "layout");
  return { success: true };
}
