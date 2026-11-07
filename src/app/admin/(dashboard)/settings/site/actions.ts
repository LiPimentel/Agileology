"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { saveUploadedImage } from "@/lib/image";
import { sanitizePlainText } from "@/lib/sanitize";
import { diffFields } from "@/lib/auditDetail";

const SITE_LABELS = {
  siteTitle: "Nombre del sitio",
  tagline: "Lema",
  defaultMetaDescription: "Descripción para buscadores",
  footerText: "Texto del pie",
  logoUrl: "Logo",
  faviconUrl: "Favicon",
  facebookUrl: "Facebook",
  twitterUrl: "Twitter/X",
  linkedinUrl: "LinkedIn",
  instagramUrl: "Instagram",
  telegramUrl: "Telegram",
  facebookIconUrl: "Icono de Facebook",
  twitterIconUrl: "Icono de Twitter/X",
  linkedinIconUrl: "Icono de LinkedIn",
  instagramIconUrl: "Icono de Instagram",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  cookieNoticeEnabled: "Aviso de cookies",
  googleSiteVerification: "Verificación de Google",
};

export type SiteSettingsState = { error?: string; success?: boolean };

export async function updateSiteSettings(_prev: SiteSettingsState, formData: FormData): Promise<SiteSettingsState> {
  const admin = await requireAdmin();

  const siteTitle = sanitizePlainText(String(formData.get("siteTitle") ?? "")).slice(0, 120);
  if (!siteTitle) return { error: "El nombre del sitio es requerido." };

  const telegramUrl = String(formData.get("telegramUrl") ?? "").trim();
  if (telegramUrl && !/^https:\/\/[^\s]+$/i.test(telegramUrl)) {
    return { error: "El enlace de Telegram debe empezar por https:// (por ejemplo https://t.me/tu_canal)." };
  }

  const data: Record<string, unknown> = {
    siteTitle,
    tagline: sanitizePlainText(String(formData.get("tagline") ?? "")) || null,
    defaultMetaDescription: sanitizePlainText(String(formData.get("defaultMetaDescription") ?? "")) || null,
    footerText: sanitizePlainText(String(formData.get("footerText") ?? "")) || null,
    facebookUrl: String(formData.get("facebookUrl") ?? "").trim() || null,
    twitterUrl: String(formData.get("twitterUrl") ?? "").trim() || null,
    linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || null,
    instagramUrl: String(formData.get("instagramUrl") ?? "").trim() || null,
    telegramUrl: telegramUrl || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    cookieNoticeEnabled: formData.get("cookieNoticeEnabled") === "on",
    // Just the content value of the <meta name="google-site-verification">
    // tag -- sanitizePlainText is enough here (it's rendered as an
    // attribute value, never as HTML), and this field alone is what
    // Search Console needs to confirm domain ownership.
    googleSiteVerification: sanitizePlainText(String(formData.get("googleSiteVerification") ?? "")).trim() || null,
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

  const before = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const after = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  await logAudit({
    adminId: admin.id,
    action: "update_site_settings",
    entityType: "SiteSettings",
    entityId: "singleton",
    detail: { entity: "Ajustes del sitio", changes: diffFields(SITE_LABELS, before ?? {}, after) },
  });
  revalidatePath("/", "layout");

  return { success: true };
}
