"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { saveUploadedImage } from "@/lib/image";
import { sanitizePlainText } from "@/lib/sanitize";

export type SiteSettingsState = { error?: string; success?: boolean };

export async function updateSiteSettings(_prev: SiteSettingsState, formData: FormData): Promise<SiteSettingsState> {
  const admin = await requireAdmin();

  const siteTitle = sanitizePlainText(String(formData.get("siteTitle") ?? "")).slice(0, 120);
  if (!siteTitle) return { error: "El nombre del sitio es requerido." };

  const data: Record<string, unknown> = {
    siteTitle,
    tagline: sanitizePlainText(String(formData.get("tagline") ?? "")) || null,
    defaultMetaDescription: sanitizePlainText(String(formData.get("defaultMetaDescription") ?? "")) || null,
    footerText: sanitizePlainText(String(formData.get("footerText") ?? "")) || null,
    facebookUrl: String(formData.get("facebookUrl") ?? "").trim() || null,
    twitterUrl: String(formData.get("twitterUrl") ?? "").trim() || null,
    linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || null,
    instagramUrl: String(formData.get("instagramUrl") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    cookieNoticeEnabled: formData.get("cookieNoticeEnabled") === "on",
  };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const saved = await saveUploadedImage(logo);
    data.logoUrl = saved.url;
  }
  const favicon = formData.get("favicon");
  if (favicon instanceof File && favicon.size > 0) {
    const saved = await saveUploadedImage(favicon);
    data.faviconUrl = saved.url;
  }

  for (const [field, column] of [
    ["facebookIcon", "facebookIconUrl"],
    ["twitterIcon", "twitterIconUrl"],
    ["linkedinIcon", "linkedinIconUrl"],
    ["instagramIcon", "instagramIconUrl"],
  ] as const) {
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      const saved = await saveUploadedImage(file);
      data[column] = saved.url;
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  await logAudit({ adminId: admin.id, action: "update_site_settings", entityType: "SiteSettings", entityId: "singleton" });
  revalidatePath("/", "layout");

  return { success: true };
}
