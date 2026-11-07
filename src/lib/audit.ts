import "server-only";
import { prisma } from "@/lib/prisma";
import { capChanges, clip, type AuditDetail } from "@/lib/auditDetail";

/**
 * Runs `fn` and returns its result, or undefined if it throws: building the "what changed" detail
 * must never make a save that already happened look like a failure (or skip the cache refresh).
 */
export async function safely<T>(fn: () => Promise<T> | T): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    console.error("[audit] could not build details:", err instanceof Error ? err.message : err);
    return undefined;
  }
}

/** Records every content-changing backoffice action (RS-10). Never throws: see `safely`. */
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
      : JSON.stringify({
          entity: params.detail.entity ? clip(params.detail.entity, 300) : undefined,
          summary: params.detail.summary ? clip(params.detail.summary, 800) : undefined,
          changes: params.detail.changes ? capChanges(params.detail.changes) : undefined,
        });
  try {
    await prisma.auditLog.create({
      data: {
        adminId: params.adminId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        detail,
      },
    });
  } catch (err) {
    // The action itself already succeeded; a failed audit write is reported in the server log.
    console.error("[audit] could not record action", params.action, err instanceof Error ? err.message : err);
  }
}
