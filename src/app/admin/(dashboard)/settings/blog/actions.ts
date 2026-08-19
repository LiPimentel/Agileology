"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type BlogSettingsState = { success?: boolean };

export async function updateBlogLayout(_prev: BlogSettingsState, formData: FormData): Promise<BlogSettingsState> {
  const admin = await requireAdmin();
  const layoutType = String(formData.get("layoutType") ?? "grid") === "list" ? "list" : "grid";

  await prisma.blogSettings.upsert({
    where: { id: "singleton" },
    update: { layoutType },
    create: { id: "singleton", layoutType },
  });

  await logAudit({ adminId: admin.id, action: "update_blog_settings", entityType: "BlogSettings", entityId: "singleton" });
  revalidatePath("/blog");
  return { success: true };
}
