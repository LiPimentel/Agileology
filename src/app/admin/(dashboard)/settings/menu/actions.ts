"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit, safely } from "@/lib/audit";
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
  location?: "header" | "footer";
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
      // sanitizePlainText HTML-escapes "&" and React escapes it again when rendering, so keep a plain "&".
      const label = sanitizePlainText(String(item.label ?? "")).replace(/&amp;/g, "&").slice(0, 60);
      if (!label) return null;
      const linkType = item.linkType === "page" ? "page" : "url";
      if (linkType === "page" && !item.pageId) return null;
      const externalUrl = linkType === "url" ? String(item.externalUrl ?? "").trim() : null;
      if (linkType === "url" && (!externalUrl || !SAFE_URL.test(externalUrl))) return null;
      const location = item.location === "footer" ? "footer" : "header";
      return {
        id: typeof item.id === "string" && item.id ? item.id : randomUUID(),
        label,
        linkType,
        pageId: linkType === "page" ? String(item.pageId) : null,
        externalUrl,
        newTab: Boolean(item.newTab),
        visible: item.visible !== false,
        // Footer links never nest -- forced null regardless of what the
        // client sent, same as the two-level-deep guard below.
        parentId: location === "header" && typeof item.parentId === "string" ? item.parentId : null,
        location,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // A parentId is only honored when it points at another surviving header
  // item in this same submission that is itself top-level -- guards
  // against a dangling reference (its parent got dropped above) and
  // against two levels of nesting (MenuForm already hides the picker for
  // this case, but don't trust the client for it).
  const topLevelHeaderIds = new Set(validated.filter((i) => !i.parentId && i.location === "header").map((i) => i.id));
  const items = validated.map((item) => ({
    ...item,
    parentId: item.parentId && item.parentId !== item.id && topLevelHeaderIds.has(item.parentId) ? item.parentId : null,
  }));

  // Parents must land in the DB before their children (self-referencing FK,
  // checked per-row within a single multi-row INSERT) -- a stable sort
  // keeps each item's relative order within its own group (top-level
  // items among themselves, and each parent's children among themselves)
  // exactly as submitted, it only reorders the two groups relative to each
  // other.
  const ordered = [...items].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));

  const beforeItems = (await safely(() => prisma.menuItem.findMany({ orderBy: [{ location: "asc" }, { order: "asc" }] }))) ?? [];
  await prisma.$transaction([
    prisma.menuItem.deleteMany({}),
    ...(ordered.length > 0
      ? [prisma.menuItem.createMany({ data: ordered.map((item, order) => ({ ...item, order })) })]
      : []),
  ]);

  const describeMenu = (rows: Array<{ id: string; label: string; location: string; visible: boolean; parentId: string | null }>) => {
    const line = (r: (typeof rows)[number]) => `${r.label}${r.visible ? "" : " (oculto)"}`;
    const group = (loc: string) =>
      rows
        .filter((r) => r.location === loc && !r.parentId)
        .map((r) => {
          const kids = rows.filter((k) => k.parentId === r.id).map(line);
          return kids.length ? `${line(r)} ▸ ${kids.join(", ")}` : line(r);
        })
        .join(" · ") || "—";
    return `Cabecera: ${group("header")} | Pie: ${group("footer")}`;
  };
  const beforeText = describeMenu(beforeItems);
  const afterText = describeMenu(ordered.map((i) => ({ id: i.id, label: i.label, location: i.location, visible: i.visible, parentId: i.parentId })));
  await logAudit({
    adminId: admin.id,
    action: "update_menu",
    entityType: "MenuItem",
    detail: { entity: "Menú del sitio", changes: beforeText === afterText ? [] : [{ field: "Elementos del menú", from: beforeText, to: afterText }], summary: beforeText === afterText ? "Se guardó sin cambios" : undefined },
  });
  revalidatePath("/", "layout");

  return { success: true };
}
