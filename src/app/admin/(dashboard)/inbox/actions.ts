"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function markChatRead(id: string) {
  const admin = await requireAdmin();
  await prisma.chatMessage.update({ where: { id }, data: { status: "read" } });
  await logAudit({ adminId: admin.id, action: "mark_read", entityType: "ChatMessage", entityId: id });
  revalidatePath("/admin/inbox");
}

/** RS-15: admin can delete chat messages containing personal data on request. */
export async function deleteChatMessage(id: string) {
  const admin = await requireAdmin();
  await prisma.chatMessage.delete({ where: { id } });
  await logAudit({ adminId: admin.id, action: "delete", entityType: "ChatMessage", entityId: id });
  revalidatePath("/admin/inbox");
}

export async function markContactRead(id: string) {
  const admin = await requireAdmin();
  await prisma.contactFormSubmission.update({ where: { id }, data: { status: "read" } });
  await logAudit({ adminId: admin.id, action: "mark_read", entityType: "ContactFormSubmission", entityId: id });
  revalidatePath("/admin/inbox");
}

/** RS-15: admin can delete contact submissions containing personal data on request. */
export async function deleteContactSubmission(id: string) {
  const admin = await requireAdmin();
  await prisma.contactFormSubmission.delete({ where: { id } });
  await logAudit({ adminId: admin.id, action: "delete", entityType: "ContactFormSubmission", entityId: id });
  revalidatePath("/admin/inbox");
}
