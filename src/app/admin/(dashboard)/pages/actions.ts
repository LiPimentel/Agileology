"use server";

import { redirect } from "next/navigation";
import { isHomeSlug } from "@/lib/home";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit, safely } from "@/lib/audit";
import { sanitizeBlockContent } from "@/lib/blocks";
import { sanitizePlainText } from "@/lib/sanitize";
import { publishPage } from "@/lib/pages";
import { slugify } from "@/lib/slugify";
import { isUploadedVideo } from "@/lib/video";
import { diffBlocks, diffFields, type AuditDetail, type BlockLike } from "@/lib/auditDetail";

export type PageFormState = { error?: string; pageId?: string; savedAt?: number };

const PAGE_LABELS = { title: "Título", slug: "Dirección (slug)", seoTitle: "Título SEO", seoDescription: "Meta descripción SEO", status: "Estado" };
const BACKGROUND_LABELS = {
  overlayColor: "Banner: color de la capa",
  overlayOpacity: "Banner: opacidad de la capa",
  imageUrl: "Banner: imagen de fondo",
  bannerImageUrl: "Banner: imagen (logo)",
  showBanner: "Banner: mostrar",
  showTitle: "Banner: mostrar título",
};
const PAGE_STATUS = { draft: "Borrador", published: "Publicada" } as const;

async function loadPageForAudit(pageId: string) {
  return prisma.page.findUnique({
    where: { id: pageId },
    include: { blocks: { orderBy: [{ position: "asc" }, { columnIndex: "asc" }, { blockOrder: "asc" }] }, background: true },
  });
}
type PageForAudit = NonNullable<Awaited<ReturnType<typeof loadPageForAudit>>>;

/** What changed between two states of a page: its fields, banner settings and blocks. */
function describePageChange(before: PageForAudit | null, after: PageForAudit | null, summary: string): AuditDetail {
  if (!after) return { summary };
  const status = (r: PageForAudit | null) => (r ? PAGE_STATUS[r.status] : undefined);
  const changes = [
    ...diffFields(PAGE_LABELS, { ...(before ?? {}), status: status(before) }, { ...after, status: status(after) }),
    ...diffFields(BACKGROUND_LABELS, before?.background ?? {}, after.background ?? {}),
  ];
  const blocks = diffBlocks((before?.blocks ?? []) as BlockLike[], after.blocks as BlockLike[]);
  return { entity: `Página «${after.title}»`, summary: [summary, blocks.summary].filter(Boolean).join(" · "), changes: [...changes, ...blocks.changes] };
}

/** A section background video must be a file uploaded to this site (or empty). */
function sectionVideoOrNull(raw: unknown): string | null {
  const url = String(raw ?? "").trim();
  if (!url) return null;
  if (!isUploadedVideo(url)) throw new Error("El video de fondo de la sección debe ser un archivo subido a la biblioteca.");
  return url;
}

type SubmittedBlock = {
  id: string;
  type: "text" | "image" | "link" | "video" | "map" | "contactForm" | "customForm" | "carousel" | "latestPosts" | "linkedinPosts";
  content: unknown;
  position?: number;
  columnIndex?: number;
  columnWidth?: number;
  blockOrder?: number;
  sectionBgImageUrl?: string;
  sectionBgColor?: string;
  sectionBgOpacity?: number;
  sectionBgVideoUrl?: string;
  sectionBgGradientEnd?: string;
  sectionBgFocalX?: number;
  sectionBgFocalY?: number;
  sectionBgZoom?: number;
  sectionZone?: string;
  sectionLayoutMode?: string;
  sectionFreeHeight?: number;
  freeX?: number;
  freeY?: number;
  freeWidth?: number;
  freeHeight?: number;
  freeZIndex?: number;
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

/** Where a section sits: full width (default), the centre column, or a side rail. */
function sanitizeZone(v: unknown): "full" | "main" | "left" | "right" {
  return v === "main" || v === "left" || v === "right" ? v : "full";
}

function clampNumber(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
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

/** Clamps a free-layout percentage (position or size) to a sane range -- defensive only, layout data isn't sensitive. */
function sanitizePercent(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
}
function sanitizeFreeHeight(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(3000, Math.max(100, Math.round(n))) : 400;
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
  // menuOrder/showInMenu/menuVisible used to control the public nav; that's
  // now handled explicitly via MenuItem (/admin/settings/menu) instead, and
  // the page editor no longer submits these fields. Deliberately NOT read
  // from formData here anymore -- doing so would silently reset them to
  // false/0 on every save (the form fields are gone, so they'd always read
  // as absent) for columns nothing reads anymore anyway.

  const overlayColor = String(formData.get("overlayColor") ?? "#3B0764");
  const overlayOpacity = Math.min(1, Math.max(0, Number(formData.get("overlayOpacity") ?? 0.5)));
  const backgroundImageUrl = String(formData.get("backgroundImageUrl") ?? "") || null;
  const bannerImageUrl = String(formData.get("bannerImageUrl") ?? "") || null;
  const focalX = clampNumber(formData.get("backgroundFocalX"), 0, 100, 50);
  const focalY = clampNumber(formData.get("backgroundFocalY"), 0, 100, 50);
  const zoom = clampNumber(formData.get("backgroundZoom"), 1, 3, 1);
  const sideLeftWidth = Math.round(clampNumber(formData.get("sideLeftWidth"), 15, 35, 22));
  const sideRightWidth = Math.round(clampNumber(formData.get("sideRightWidth"), 15, 35, 22));
  const showBanner = formData.get("showBanner") === "on";
  const showTitle = formData.get("showTitle") === "on";

  // Map/contact form used to be separate page-level singletons (own
  // formData fields, own DB tables) -- they're regular blocks now (see
  // blocks.ts), so they flow through the same blocksJson path as every
  // other block type below. No special-casing needed here anymore.
  const blocksRaw = parseBlocks(String(formData.get("blocksJson") ?? "[]"));
  // Sections editor sends position (shared by every block/column in one
  // section = one row) and columnIndex/columnWidth (this block's slot and
  // width within that row) directly -- fall back to a linear index for
  // anything malformed/missing so a bad payload still saves sensibly rather
  // than throwing.
  // An editor tab opened before side rails existed does not send `sectionZone` at all; saving from it
  // must not reset every section to full width, so keep the zones the page already had (by position).
  const legacyClient = blocksRaw.length > 0 && blocksRaw.every((b) => b.sectionZone === undefined);
  const previousZones = new Map<number, string>();
  if (legacyClient) {
    const prev = await prisma.contentBlock.findMany({ where: { pageId }, select: { position: true, sectionZone: true } });
    for (const p of prev) previousZones.set(p.position, p.sectionZone);
  }
  const blocks = blocksRaw.map((b, i) => ({
    type: b.type,
    content: sanitizeBlockContent(b.type, b.content) as object,
    position: Number.isFinite(b.position) ? Number(b.position) : i,
    columnIndex: Number.isFinite(b.columnIndex) ? Number(b.columnIndex) : 0,
    columnWidth: sanitizeColumnWidth(b.columnWidth),
    blockOrder: Number.isFinite(b.blockOrder) ? Number(b.blockOrder) : 0,
    sectionBgImageUrl: String(b.sectionBgImageUrl ?? "") || null,
    sectionBgColor: sanitizeHexColor(b.sectionBgColor, "#000000"),
    sectionBgOpacity: sanitizeOpacity(b.sectionBgOpacity),
    sectionBgVideoUrl: sectionVideoOrNull(b.sectionBgVideoUrl),
    sectionBgGradientEnd: String(b.sectionBgGradientEnd ?? "") || null,
    sectionBgFocalX: clampNumber(b.sectionBgFocalX, 0, 100, 50),
    sectionBgFocalY: clampNumber(b.sectionBgFocalY, 0, 100, 50),
    sectionBgZoom: clampNumber(b.sectionBgZoom, 1, 3, 1),
    sectionZone: sanitizeZone(legacyClient ? previousZones.get(Number.isFinite(b.position) ? Number(b.position) : i) : b.sectionZone),
    sectionLayoutMode: b.sectionLayoutMode === "free" ? "free" : "grid",
    sectionFreeHeight: sanitizeFreeHeight(b.sectionFreeHeight),
    freeX: sanitizePercent(b.freeX, 10),
    freeY: sanitizePercent(b.freeY, 10),
    freeWidth: sanitizePercent(b.freeWidth, 30),
    freeHeight: sanitizePercent(b.freeHeight, 30),
    freeZIndex: Number.isFinite(b.freeZIndex) ? Number(b.freeZIndex) : 0,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.page.update({
      where: { id: pageId },
      data: { title, slug, seoTitle, seoDescription },
    });

    await tx.contentBlock.deleteMany({ where: { pageId } });
    if (blocks.length > 0) {
      await tx.contentBlock.createMany({ data: blocks.map((b) => ({ ...b, pageId })) });
    }

    await tx.background.upsert({
      where: { pageId },
      update: { overlayColor, overlayOpacity, imageUrl: backgroundImageUrl, focalX, focalY, zoom, bannerImageUrl, showBanner, showTitle, sideLeftWidth, sideRightWidth },
      create: { pageId, overlayColor, overlayOpacity, imageUrl: backgroundImageUrl, focalX, focalY, zoom, bannerImageUrl, showBanner, showTitle, sideLeftWidth, sideRightWidth },
    });
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
  await logAudit({ adminId: admin.id, action: "create_page", entityType: "Page", entityId: page.id, detail: { entity: `Página «${page.title}»`, summary: `Dirección /${page.slug}` } });
  redirect(`/admin/pages/${page.id}`);
}

export async function savePage(_prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const admin = await requireAdmin();
  const pageId = String(formData.get("pageId") ?? "");
  const intent = String(formData.get("intent") ?? "draft");

  const before = (await safely(() => loadPageForAudit(pageId))) ?? null;
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
    detail: await safely(async () => describePageChange(before, await loadPageForAudit(pageId), intent === "publish" ? "Guardó y publicó" : "Guardó el borrador")),
  });
  revalidatePath("/admin/pages");
  if (intent === "publish") {
    revalidatePath(isHomeSlug(slug) ? "/" : `/${slug}`);
    revalidatePath("/", "layout");
  }
  return { pageId, savedAt: Date.now() };
}

export async function deletePage(pageId: string) {
  const admin = await requireAdmin();
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page || page.isSystem) throw new Error("No se puede eliminar esta página.");
  await prisma.page.delete({ where: { id: pageId } });
  await logAudit({ adminId: admin.id, action: "delete_page", entityType: "Page", entityId: pageId, detail: { entity: `Página «${page.title}»`, summary: `Se eliminó la página /${page.slug}` } });
  revalidatePath("/admin/pages");
}

export async function duplicatePage(pageId: string) {
  const admin = await requireAdmin();
  const source = await prisma.page.findUnique({
    where: { id: pageId },
    include: { blocks: true, background: true },
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
          blockOrder: b.blockOrder,
          sectionBgImageUrl: b.sectionBgImageUrl,
          sectionBgColor: b.sectionBgColor,
          sectionBgOpacity: b.sectionBgOpacity,
          sectionBgVideoUrl: b.sectionBgVideoUrl,
          sectionBgGradientEnd: b.sectionBgGradientEnd,
          sectionBgFocalX: b.sectionBgFocalX,
          sectionBgFocalY: b.sectionBgFocalY,
          sectionBgZoom: b.sectionBgZoom,
          sectionZone: b.sectionZone,
          sectionLayoutMode: b.sectionLayoutMode,
          sectionFreeHeight: b.sectionFreeHeight,
          freeX: b.freeX,
          freeY: b.freeY,
          freeWidth: b.freeWidth,
          freeHeight: b.freeHeight,
          freeZIndex: b.freeZIndex,
        })),
      },
      background: source.background
        ? {
            create: {
              imageUrl: source.background.imageUrl,
              overlayColor: source.background.overlayColor,
              overlayOpacity: source.background.overlayOpacity,
              bannerImageUrl: source.background.bannerImageUrl,
              focalX: source.background.focalX,
              focalY: source.background.focalY,
              zoom: source.background.zoom,
              showBanner: source.background.showBanner,
              showTitle: source.background.showTitle,
              sideLeftWidth: source.background.sideLeftWidth,
              sideRightWidth: source.background.sideRightWidth,
            },
          }
        : { create: {} },
    },
  });

  await logAudit({ adminId: admin.id, action: "duplicate_page", entityType: "Page", entityId: copy.id, detail: { entity: `Página «${copy.title}»`, summary: `Copia de «${source.title}»` } });
  revalidatePath("/admin/pages");
}

/**
 * RF-23: brings an earlier saved version back into the page's working copy (the draft). It does NOT
 * publish: the editor reviews it first and publishes when ready.
 */
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
              blockOrder?: number;
              sectionBgImageUrl?: string | null;
              sectionBgColor?: string;
              sectionBgOpacity?: number;
              sectionBgVideoUrl?: string | null;
              sectionBgGradientEnd?: string | null;
              sectionBgFocalX?: number;
              sectionBgFocalY?: number;
              sectionBgZoom?: number;
              sectionZone?: string;
              sectionLayoutMode?: string;
              sectionFreeHeight?: number;
              freeX?: number;
              freeY?: number;
              freeWidth?: number;
              freeHeight?: number;
              freeZIndex?: number;
            },
            i: number,
          ) => ({
            pageId,
            type: b.type,
            content: b.content,
            // Older snapshots (published before sections/section
            // backgrounds/multi-block columns/free layout existed) have
            // none of these -- fall back to one block per single-column,
            // background-less, grid-mode section, i.e. today's flat layout.
            position: b.position ?? i,
            columnIndex: b.columnIndex ?? 0,
            columnWidth: b.columnWidth ?? 100,
            blockOrder: b.blockOrder ?? 0,
            sectionBgImageUrl: b.sectionBgImageUrl ?? null,
            sectionBgColor: b.sectionBgColor ?? "#000000",
            sectionBgVideoUrl: b.sectionBgVideoUrl ?? null,
            sectionBgGradientEnd: b.sectionBgGradientEnd ?? null,
            sectionBgFocalX: clampNumber(b.sectionBgFocalX, 0, 100, 50),
            sectionBgFocalY: clampNumber(b.sectionBgFocalY, 0, 100, 50),
            sectionBgZoom: clampNumber(b.sectionBgZoom, 1, 3, 1),
            sectionBgOpacity: b.sectionBgOpacity ?? 0,
            sectionZone: sanitizeZone(b.sectionZone),
            sectionLayoutMode: b.sectionLayoutMode ?? "grid",
            sectionFreeHeight: b.sectionFreeHeight ?? 400,
            freeX: b.freeX ?? 10,
            freeY: b.freeY ?? 10,
            freeWidth: b.freeWidth ?? 30,
            freeHeight: b.freeHeight ?? 30,
            freeZIndex: b.freeZIndex ?? 0,
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
        bannerImageUrl: snapshot.background?.bannerImageUrl ?? null,
        focalX: clampNumber(snapshot.background?.focalX, 0, 100, 50),
        focalY: clampNumber(snapshot.background?.focalY, 0, 100, 50),
        zoom: clampNumber(snapshot.background?.zoom, 1, 3, 1),
        showBanner: snapshot.background?.showBanner ?? true,
        showTitle: snapshot.background?.showTitle ?? true,
        sideLeftWidth: Math.round(clampNumber(snapshot.background?.sideLeftWidth, 15, 35, 22)),
        sideRightWidth: Math.round(clampNumber(snapshot.background?.sideRightWidth, 15, 35, 22)),
      },
      create: {
        pageId,
        imageUrl: snapshot.background?.imageUrl ?? null,
        overlayColor: snapshot.background?.overlayColor ?? "#3B0764",
        overlayOpacity: snapshot.background?.overlayOpacity ?? 0.5,
        bannerImageUrl: snapshot.background?.bannerImageUrl ?? null,
        focalX: clampNumber(snapshot.background?.focalX, 0, 100, 50),
        focalY: clampNumber(snapshot.background?.focalY, 0, 100, 50),
        zoom: clampNumber(snapshot.background?.zoom, 1, 3, 1),
        showBanner: snapshot.background?.showBanner ?? true,
        showTitle: snapshot.background?.showTitle ?? true,
        sideLeftWidth: Math.round(clampNumber(snapshot.background?.sideLeftWidth, 15, 35, 22)),
        sideRightWidth: Math.round(clampNumber(snapshot.background?.sideRightWidth, 15, 35, 22)),
      },
    });
  });

  await logAudit({ adminId: admin.id, action: "restore_version", entityType: "Page", entityId: pageId, detail: { entity: `Página «${(await prisma.page.findUnique({ where: { id: pageId }, select: { title: true } }))?.title ?? pageId}»`, summary: `Restauró como borrador la versión del ${version.createdAt.toISOString()} (sin publicar)` } });
  revalidatePath(`/admin/pages/${pageId}`);
}
