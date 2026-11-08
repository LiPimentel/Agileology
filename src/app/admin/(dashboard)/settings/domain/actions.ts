"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit, safely } from "@/lib/audit";
import { diffFields } from "@/lib/auditDetail";
import { getSiteSettings } from "@/lib/settings";
import { runDomainChecks, type Check } from "@/lib/domainCheck";
import { CANONICAL_HOSTS, isIpOrLocalHost, normalizePublicUrl, type CanonicalHost } from "@/lib/siteUrl";

export type DomainState = { error?: string; savedAt?: number };
export type VerifyState = { checks?: Check[]; at?: number };

export async function saveDomain(_prev: DomainState, formData: FormData): Promise<DomainState> {
  const admin = await requireAdmin();
  const raw = String(formData.get("publicUrl") ?? "").trim();
  const requestedHost = String(formData.get("canonicalHost") ?? "none") as CanonicalHost;
  const canonicalHost: CanonicalHost = CANONICAL_HOSTS.includes(requestedHost) ? requestedHost : "none";

  let publicUrl: string | null = null;
  if (raw) {
    const n = normalizePublicUrl(raw);
    if (!n.ok) return { error: n.error };
    publicUrl = n.url;
    if (canonicalHost !== "none" && isIpOrLocalHost(n.host)) return { error: "«Con o sin www» solo se aplica a un dominio, no a una IP ni a localhost." };
  } else if (canonicalHost !== "none") {
    return { error: "Para elegir «con o sin www» primero escribe la dirección del sitio." };
  }

  const before = await getSiteSettings();
  await prisma.siteSettings.update({ where: { id: "singleton" }, data: { publicUrl, canonicalHost } });

  await logAudit({
    adminId: admin.id,
    action: "update_domain",
    entityType: "SiteSettings",
    entityId: "singleton",
    detail: await safely(() => ({
      entity: "Dominio y publicación",
      changes: diffFields({ publicUrl: "Dirección pública", canonicalHost: "Con o sin www" }, { publicUrl: before.publicUrl, canonicalHost: before.canonicalHost }, { publicUrl, canonicalHost }),
    })),
  });
  // Sitemap, robots, RSS, canonical links and e-mail links all read the address.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/domain");
  return { savedAt: Date.now() };
}

/** "Verificar ahora": runs the live checks against the saved address. */
// useActionState passes the previous state first; this action has nothing to read from it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function verifyDomain(_prev: VerifyState): Promise<VerifyState> {
  await requireAdmin();
  const settings = await getSiteSettings();
  const publicUrl = (settings.publicUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "") || null;
  return { checks: await runDomainChecks(publicUrl), at: Date.now() };
}
