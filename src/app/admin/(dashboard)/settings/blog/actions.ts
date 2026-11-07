"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { diffFields } from "@/lib/auditDetail";

export type BlogSettingsState = { success?: boolean };

export async function updateBlogLayout(_prev: BlogSettingsState, formData: FormData): Promise<BlogSettingsState> {
  const admin = await requireAdmin();
  const layoutType = String(formData.get("layoutType") ?? "grid") === "list" ? "list" : "grid";

  const before = await prisma.blogSettings.findUnique({ where: { id: "singleton" } });
  await prisma.blogSettings.upsert({
    where: { id: "singleton" },
    update: { layoutType },
    create: { id: "singleton", layoutType },
  });

  const layoutName = (v: string | undefined) => (v === "list" ? "Lista" : v === "grid" ? "Cuadrícula" : undefined);
  await logAudit({
    adminId: admin.id,
    action: "update_blog_settings",
    entityType: "BlogSettings",
    entityId: "singleton",
    detail: { entity: "Diseño del blog", changes: diffFields({ layoutType: "Diseño" }, { layoutType: layoutName(before?.layoutType) }, { layoutType: layoutName(layoutType) }) },
  });
  revalidatePath("/blog");
  return { success: true };
}
