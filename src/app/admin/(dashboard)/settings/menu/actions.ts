"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sanitizePlainText } from "@/lib/sanitize";

export type MenuFormState = { error?: string; success?: boolean };

type SubmittedMenuItem = {
  label: string;
  linkType: "page" | "url";
  pageId?: string | null;
  externalUrl?: string | null;
  newTab?: boolean;
  visible?: boolean;
};

function parseItems(raw: string): SubmittedMenuItem[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Only admins can set this, but it still renders straight into an href on
// the public site -- reject javascript:/data: etc. rather than trust an
// open text field by convention alone.
const SAFE_URL = /^(\/|https?:\/\/|mailto:|tel:)/i;

/** Rewrites the whole menu from the editor's list state (same delete-and-recreate pattern as page/post blocks). */
export async function saveMenuItems(_prev: MenuFormState, formData: FormData): Promise<MenuFormState> {
  const admin = await requireAdmin();

  const raw = parseItems(String(formData.get("itemsJson") ?? "[]"));
  const items = raw
    .map((item) => {
      const label = sanitizePlainText(String(item.label ?? "")).slice(0, 60);
      if (!label) return null;
      const linkType = item.linkType === "page" ? "page" : "url";
      if (linkType === "page" && !item.pageId) return null;
      const externalUrl = linkType === "url" ? String(item.externalUrl ?? "").trim() : null;
      if (linkType === "url" && (!externalUrl || !SAFE_URL.test(externalUrl))) return null;
      return {
        label,
        linkType,
        pageId: linkType === "page" ? String(item.pageId) : null,
        externalUrl,
        newTab: Boolean(item.newTab),
        visible: item.visible !== false,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  await prisma.$transaction([
    prisma.menuItem.deleteMany({}),
    ...(items.length > 0
      ? [prisma.menuItem.createMany({ data: items.map((item, order) => ({ ...item, order })) })]
      : []),
  ]);

  await logAudit({ adminId: admin.id, action: "update_menu", entityType: "MenuItem" });
  revalidatePath("/", "layout");

  return { success: true };
}
