"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit, safely } from "@/lib/audit";
import { sanitizePlainText } from "@/lib/sanitize";
import { diffFields, type AuditChange } from "@/lib/auditDetail";
import { getSiteSettings } from "@/lib/settings";

export type SeoState = { error?: string; savedAt?: number };

const clean = (raw: FormDataEntryValue | null, max: number) => sanitizePlainText(String(raw ?? "")).slice(0, max) || null;

/** Saves the SEO title/description of every page shown in one go, plus the site-wide default description. */
export async function saveSeo(_prev: SeoState, formData: FormData): Promise<SeoState> {
  const admin = await requireAdmin();
  const ids = formData.getAll("pageId").map(String);

  const rows = await prisma.page.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, status: true, seoTitle: true, seoDescription: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const updates = [];
  const changes: AuditChange[] = [];
  let livePageChanged = false;
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue; // an id that no longer exists (deleted meanwhile): skip it
    const seoTitle = clean(formData.get(`seoTitle:${id}`), 120);
    const seoDescription = clean(formData.get(`seoDescription:${id}`), 300);
    if (seoTitle === row.seoTitle && seoDescription === row.seoDescription) continue;
    updates.push(prisma.page.update({ where: { id }, data: { seoTitle, seoDescription } }));
    changes.push(...diffFields({ seoTitle: `«${row.title}»: título SEO`, seoDescription: `«${row.title}»: descripción SEO` }, row, { seoTitle, seoDescription }));
    if (row.status === "published") livePageChanged = true;
  }

  const defaultDescription = clean(formData.get("defaultMetaDescription"), 300);
  const settings = await getSiteSettings();
  const defaultChanged = defaultDescription !== (settings.defaultMetaDescription ?? null);
  if (defaultChanged) {
    updates.push(prisma.siteSettings.update({ where: { id: "singleton" }, data: { defaultMetaDescription: defaultDescription } }));
    changes.push(...diffFields({ d: "Descripción por defecto del sitio" }, { d: settings.defaultMetaDescription }, { d: defaultDescription }));
  }

  if (updates.length === 0) return { savedAt: Date.now() };
  try {
    await prisma.$transaction(updates);
  } catch {
    return { error: "No se pudo guardar el SEO. Intenta de nuevo." };
  }

  await logAudit({
    adminId: admin.id,
    action: "update_seo",
    entityType: "Page",
    detail: await safely(() => ({ entity: "SEO de las páginas", summary: `${changes.length} cambio${changes.length === 1 ? "" : "s"}`, changes })),
  });
  revalidatePath("/admin/settings/seo");
  // Titles and descriptions are read for every public page, and the default feeds all of them.
  if (livePageChanged || defaultChanged) revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}
