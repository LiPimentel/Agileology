"use server";

import { redirect } from "next/navigation";
import { destroySession, getCurrentAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function logout() {
  const admin = await getCurrentAdmin();
  if (admin) await logAudit({ adminId: admin.id, action: "logout", entityType: "Admin", entityId: admin.id });
  await destroySession();
  redirect("/admin/login");
}
