import "server-only";
import { prisma } from "@/lib/prisma";

/** Records every content-changing backoffice action (RS-10). */
export async function logAudit(params: {
  adminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: string;
}) {
  await prisma.auditLog.create({
    data: {
      adminId: params.adminId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      detail: params.detail,
    },
  });
}
