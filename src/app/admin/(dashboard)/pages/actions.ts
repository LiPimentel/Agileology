"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sanitizeBlockContent } from "@/lib/blocks";
import { sanitizePlainText } from "@/lib/sanitize";
import { publishPage } from "@/lib/pages";
import { slugify } from "@/lib/slugify";

export type PageFormState = { error?: string; pageId?: string; savedAt?: number };

type SubmittedBlock = {
  id: string;
  type: "text" | "image" | "link" | "video";
  content: unknown;
  position?: number;
  columnIndex?: number;
  columnWidth?: number;
  sectionBgImageUrl?: string;
  sectionBgColor?: string;
  sectionBgOpacity?: number;
};

function parseBlocks(raw: string): SubmittedBlock[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

/** Clamp a client-submitted column width to a sane range (defensive -- this is only ever layout, not sensitive data). */
function sanitizeColumnWidth(width: unknown) {
  const n = Number(width);
  if (!Number.isFinite(n)) return 100;
  return Math.min(100, Math.max(10, Math.round(n)));
}

function sanitizeOpacity(opacity: unknown) {
  const n = Number(opacity);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
function sanitizeHexColor(color: unknown, fallback: string) {
  const s = String(color ?? "");
  return HEX_COLOR.test(s) ? s : fallback;
}

async function upsertPageContent(pageId: string, formData: FormData) {
  const title = sanitizePlainText(String(formData.get("title") ?? "")).slice(0, 200);
  const slug = slugify(String(formData.get("slug") ?? "") || title);
  if (!title) throw new Error("El título es requerido.");
  if (!slug) throw new Error("El slug es requerido.");

  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing && existing.id !== pageId) {
    throw new Error("Ya existe otra página con ese slug.");
  }

  const seoTitle = sanitizePlainText(String(formData.get("seoTitle") ?? "")) || null;
  const seoDescription = sanitizePlainText(String(formData.get("seoDescription") ?? "")) || null;
  const menuOrder = Number(formData.get("menuOrder") ?? 0) || 0;
  const showInMenu = formData.get("showInMenu") === "on";
  const menuVisible = formData.get("menuVisible") === "on";

  const overlayColor = String(formData.get("overlayColor") ?? "#3B0764");
  const overlayOpacity = Math.min(1, Math.max(0, Number(formData.get("overlayOpacity") ?? 0.5)));
  const backgroundImageUrl = String(formData.get("backgroundImageUrl") ?? "") || null;

  const includeMap = formData.get("includeMap") === "on";
  const mapAddress = sanitizePlainText(String(formData.get("mapAddress") ?? ""));

  const includeContactForm = formData.get("includeContactForm") === "on";
  const contactFields = formData.getAll("contactFields").map(String);

  const blocksRaw = parseBlocks(String(formData.get("blocksJson") ?? "[]"));
  // Sections editor sends position (shared by every block/column in one
  // section = one row) and columnIndex/columnWidth (this block's slot and
  // width within that row) directly -- fall back to a linear index for
  // anything malformed/missing so a bad payload still saves sensibly rather
  // than throwing.
  const blocks = blocksRaw.map((b, i) => ({
    type: b.type,
    content: sanitizeBlockContent(b.type, b.content) as object,
    position: Number.isFinite(b.position) ? Number(b.position) : i,
    columnIndex: Number.isFinite(b.columnIndex) ? Number(b.columnIndex) : 0,
    columnWidth: sanitizeColumnWidth(b.columnWidth),
    sectionBgImageUrl: String(b.sectionBgImageUrl ?? "") || null,
    sectionBgColor: sanitizeHexColor(b.sectionBgColor, "#000000"),
    sectionBgOpacity: sanitizeOpacity(b.sectionBgOpacity),
  }));

  await prisma.$transaction(async (tx) => {
    await tx.page.update({
      where: { id: pageId },
      data: { title, slug, seoTitle, seoDescription, menuOrder, showInMenu, menuVisible },
    });

    await tx.contentBlock.deleteMany({ where: { pageId } });
    if (blocks.length > 0) {
      await tx.contentBlock.createMany({ data: blocks.map((b) => ({ ...b, pageId })) });
    }

    await tx.background.upsert({
      where: { pageId },
      update: { overlayColor, overlayOpacity, imageUrl: backgroundImageUrl },
      create: { pageId, overlayColor, overlayOpacity, imageUrl: backgroundImageUrl },
    });

    if (includeMap && mapAddress) {
      await tx.mapComponent.upsert({
        where: { pageId },
        update: { address: mapAddress },
        create: { pageId, address: mapAddress },
      });
    } else {
      await tx.mapComponent.deleteMany({ where: { pageId } });
    }

    if (includeContactForm) {
      await tx.contactFormComponent.upsert({
        where: { pageId },
        update: { enabledFields: contactFields.length ? contactFields : ["name", "email", "message"] },
        create: { pageId, enabledFields: contactFields.length ? contactFields : ["name", "email", "message"] },
      });
    } else {
      await tx.contactFormComponent.deleteMany({ where: { pageId } });
    }
  });

  return slug;
}

export async function createPage(_prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const admin = await requireAdmin();
  const title = sanitizePlainText(String(formData.get("title") ?? "")).slice(0, 200) || "Nueva página";
  const baseSlug = slugify(title) || "nueva-pagina";

  let slug = baseSlug;
  let n = 1;
  while (await prisma.page.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const page = await prisma.page.create({
    data: { title, slug, background: { create: {} } },
  });
  await logAudit({ adminId: admin.id, action: "create_page", entityType: "Page", entityId: page.id });
  redirect(`/admin/pages/${page.id}`);
}

export async function savePage(_prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const admin = await requireAdmin();
  const pageId = String(formData.get("pageId") ?? "");
  const intent = String(formData.get("intent") ?? "draft");

  let slug: string;
  try {
    slug = await upsertPageContent(pageId, formData);
    if (intent === "publish") await publishPage(pageId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar." };
  }

  await logAudit({
    adminId: admin.id,
    action: intent === "publish" ? "publish_page" : "save_draft",
    entityType: "Page",
    entityId: pageId,
  });
  revalidatePath("/admin/pages");
  if (intent === "publish") {
    revalidatePath(slug === "home" ? "/" : `/${slug}`);
    revalidatePath("/", "layout");
  }
  return { pageId, savedAt: Date.now() };
}

export async function deletePage(pageId: string) {
  const admin = await requireAdmin();
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page || page.isSystem) throw new Error("No se puede eliminar esta página.");
  await prisma.page.delete({ where: { id: pageId } });
  await logAudit({ adminId: admin.id, action: "delete_page", entityType: "Page", entityId: pageId });
  revalidatePath("/admin/pages");
}

export async function duplicatePage(pageId: string) {
  const admin = await requireAdmin();
  const source = await prisma.page.findUnique({
    where: { id: pageId },
    include: { blocks: true, background: true, mapComponent: true, contactFormComponent: true },
  });
  if (!source) throw new Error("Página no encontrada.");

  let slug = `${source.slug}-copia`;
  let n = 1;
  while (await prisma.page.findUnique({ where: { slug } })) {
    slug = `${source.slug}-copia-${++n}`;
  }

  const copy = await prisma.page.create({
    data: {
      title: `${source.title} (copia)`,
      slug,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      showInMenu: false,
      blocks: {
        create: source.blocks.map((b) => ({
          type: b.type,
          content: b.content as object,
          position: b.position,
          columnIndex: b.columnIndex,
          columnWidth: b.columnWidth,
          sectionBgImageUrl: b.sectionBgImageUrl,
          sectionBgColor: b.sectionBgColor,
          sectionBgOpacity: b.sectionBgOpacity,
        })),
      },
      background: source.background
        ? { create: { imageUrl: source.background.imageUrl, overlayColor: source.background.overlayColor, overlayOpacity: source.background.overlayOpacity } }
        : { create: {} },
      mapComponent: source.mapComponent ? { create: { address: source.mapComponent.address } } : undefined,
      contactFormComponent: source.contactFormComponent
        ? { create: { enabledFields: source.contactFormComponent.enabledFields } }
        : undefined,
    },
  });

  await logAudit({ adminId: admin.id, action: "duplicate_page", entityType: "Page", entityId: copy.id });
  revalidatePath("/admin/pages");
}

/** RF-23: rolls a page back to a previously published snapshot by re-publishing it. */
export async function restorePageVersion(pageId: string, versionId: string) {
  const admin = await requireAdmin();
  const version = await prisma.pageVersion.findUnique({ where: { id: versionId } });
  if (!version || version.pageId !== pageId) throw new Error("Versión no encontrada.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshot = version.snapshot as any;

  await prisma.$transaction(async (tx) => {
    await tx.page.update({ where: { id: pageId }, data: { title: snapshot.title } });
    await tx.contentBlock.deleteMany({ where: { pageId } });
    if (snapshot.blocks?.length) {
      await tx.contentBlock.createMany({
        data: snapshot.blocks.map(
          (
            b: {
              type: string;
              content: object;
              position?: number;
              columnIndex?: number;
              columnWidth?: number;
              sectionBgImageUrl?: string | null;
              sectionBgColor?: string;
              sectionBgOpacity?: number;
            },
            i: number,
          ) => ({
            pageId,
            type: b.type,
            content: b.content,
            // Older snapshots (published before sections/section
            // backgrounds existed) have none of these -- fall back to one
            // block per single-column, background-less section, i.e.
            // today's flat layout.
            position: b.position ?? i,
            columnIndex: b.columnIndex ?? 0,
            columnWidth: b.columnWidth ?? 100,
            sectionBgImageUrl: b.sectionBgImageUrl ?? null,
            sectionBgColor: b.sectionBgColor ?? "#000000",
            sectionBgOpacity: b.sectionBgOpacity ?? 0,
          }),
        ),
      });
    }
    await tx.background.upsert({
      where: { pageId },
      update: {
        imageUrl: snapshot.background?.imageUrl ?? null,
        overlayColor: snapshot.background?.overlayColor ?? "#3B0764",
        overlayOpacity: snapshot.background?.overlayOpacity ?? 0.5,
      },
      create: {
        pageId,
        imageUrl: snapshot.background?.imageUrl ?? null,
        overlayColor: snapshot.background?.overlayColor ?? "#3B0764",
        overlayOpacity: snapshot.background?.overlayOpacity ?? 0.5,
      },
    });
  });

  await publishPage(pageId);
  await logAudit({ adminId: admin.id, action: "restore_version", entityType: "Page", entityId: pageId, detail: versionId });
  revalidatePath(`/admin/pages/${pageId}`);
}
