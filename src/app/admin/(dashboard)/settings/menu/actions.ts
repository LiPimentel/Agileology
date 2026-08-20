"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sanitizePlainText } from "@/lib/sanitize";

export type MenuFormState = { error?: string; success?: boolean };

type SubmittedMenuItem = {
  id?: string;
  label: string;
  linkType: "page" | "url";
  pageId?: string | null;
  externalUrl?: string | null;
  newTab?: boolean;
  visible?: boolean;
  parentId?: string | null;
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

  // First pass: validate each item's own fields, keeping its
  // client-submitted id (MenuForm's draft id) so the parentId references
  // below can resolve -- fall back to a generated id if one is somehow
  // missing.
  const validated = raw
    .map((item) => {
      const label = sanitizePlainText(String(item.label ?? "")).slice(0, 60);
      if (!label) return null;
      const linkType = item.linkType === "page" ? "page" : "url";
      if (linkType === "page" && !item.pageId) return null;
      const externalUrl = linkType === "url" ? String(item.externalUrl ?? "").trim() : null;
      if (linkType === "url" && (!externalUrl || !SAFE_URL.test(externalUrl))) return null;
      return {
        id: typeof item.id === "string" && item.id ? item.id : randomUUID(),
        label,
        linkType,
        pageId: linkType === "page" ? String(item.pageId) : null,
        externalUrl,
        newTab: Boolean(item.newTab),
        visible: item.visible !== false,
        parentId: typeof item.parentId === "string" ? item.parentId : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // A parentId is only honored when it points at another surviving item in
  // this same submission that is itself top-level -- guards against a
  // dangling reference (its parent got dropped above) and against two
  // levels of nesting (MenuForm already hides the picker for this case,
  // but don't trust the client for it).
  const topLevelIds = new Set(validated.filter((i) => !i.parentId).map((i) => i.id));
  const items = validated.map((item) => ({
    ...item,
    parentId: item.parentId && item.parentId !== item.id && topLevelIds.has(item.parentId) ? item.parentId : null,
  }));

  // Parents must land in the DB before their children (self-referencing FK,
  // checked per-row within a single multi-row INSERT) -- a stable sort
  // keeps each item's relative order within its own group (top-level
  // items among themselves, and each parent's children among themselves)
  // exactly as submitted, it only reorders the two groups relative to each
  // other.
  const ordered = [...items].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));

  await prisma.$transaction([
    prisma.menuItem.deleteMany({}),
    ...(ordered.length > 0
      ? [prisma.menuItem.createMany({ data: ordered.map((item, order) => ({ ...item, order })) })]
      : []),
  ]);

  await logAudit({ adminId: admin.id, action: "update_menu", entityType: "MenuItem" });
  revalidatePath("/", "layout");

  return { success: true };
}
