import "server-only";
import { prisma } from "@/lib/prisma";
import { capChanges, type AuditDetail } from "@/lib/auditDetail";

/** Records every content-changing backoffice action (RS-10). */
export async function logAudit(params: {
  adminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  /** Plain text, or structured details (what changed, before → after). */
  detail?: string | AuditDetail;
}) {
  const detail =
    typeof params.detail === "string" || params.detail === undefined
      ? params.detail
      : JSON.stringify({ ...params.detail, changes: params.detail.changes ? capChanges(params.detail.changes) : undefined });
  await prisma.auditLog.create({
    data: {
      adminId: params.adminId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      detail,
    },
  });
}
