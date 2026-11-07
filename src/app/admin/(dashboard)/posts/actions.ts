"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit, safely } from "@/lib/audit";
import { sanitizeBlockContent } from "@/lib/blocks";
import { sanitizePlainText } from "@/lib/sanitize";
import { publishPost } from "@/lib/posts";
import { slugify } from "@/lib/slugify";
import { fromAstInput, toAstInput } from "@/lib/date";
import { diffBlocks, diffFields, type AuditDetail, type BlockLike } from "@/lib/auditDetail";

export type PostFormState = { error?: string; postId?: string; savedAt?: number };

type SubmittedBlock = { type: "text" | "image" | "link" | "video" | "carousel"; content: unknown };

function parseBlocks(raw: string): SubmittedBlock[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const POST_LABELS = {
  title: "Título",
  slug: "Dirección (slug)",
  excerpt: "Extracto",
  featuredImage: "Imagen destacada",
  seoTitle: "Título SEO",
  seoDescription: "Meta descripción SEO",
  tags: "Etiquetas",
  publishAt: "Programada para",
  publishedAt: "Fecha de publicación",
  status: "Estado",
};
const POST_STATUS = { draft: "Borrador", published: "Publicado" } as const;

async function loadPostForAudit(postId: string) {
  return prisma.post.findUnique({ where: { id: postId }, include: { blocks: { orderBy: { position: "asc" } } } });
}
type PostForAudit = NonNullable<Awaited<ReturnType<typeof loadPostForAudit>>>;

/** What changed between two states of a post: its fields and blocks. */
function describePostChange(before: PostForAudit | null, after: PostForAudit | null, summary: string): AuditDetail {
  if (!after) return { summary };
  const status = (r: PostForAudit | null) => (r ? POST_STATUS[r.status] : undefined);
  const changes = diffFields(POST_LABELS, { ...(before ?? {}), status: status(before) }, { ...after, status: status(after) });
  const blocks = diffBlocks((before?.blocks ?? []) as BlockLike[], after.blocks as BlockLike[]);
  return { entity: `Entrada «${after.title}»`, summary: [summary, blocks.summary].filter(Boolean).join(" · "), changes: [...changes, ...blocks.changes] };
}

async function upsertPostContent(postId: string, formData: FormData) {
  const title = sanitizePlainText(String(formData.get("title") ?? "")).slice(0, 200);
  const slug = slugify(String(formData.get("slug") ?? "") || title);
  if (!title) throw new Error("El título es requerido.");
  if (!slug) throw new Error("El slug es requerido.");

  const existing = await prisma.post.findUnique({ where: { slug } });
  if (existing && existing.id !== postId) throw new Error("Ya existe otro post con ese slug.");

  const excerpt = sanitizePlainText(String(formData.get("excerpt") ?? "")) || null;
  const featuredImage = String(formData.get("featuredImage") ?? "").trim() || null;
  if (featuredImage && !/^\/uploads\/[\w./-]+$/.test(featuredImage) && !/^https:\/\/[^\s]+$/i.test(featuredImage)) {
    throw new Error("La imagen destacada debe ser un archivo de la biblioteca o un enlace https.");
  }
  const seoTitle = sanitizePlainText(String(formData.get("seoTitle") ?? "")) || null;
  const seoDescription = sanitizePlainText(String(formData.get("seoDescription") ?? "")) || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => sanitizePlainText(t.trim()))
    .filter(Boolean);
  const publishAtRaw = String(formData.get("publishAt") ?? "");
  const publishAt = publishAtRaw ? new Date(publishAtRaw) : null;

  // Displayed publication date (separate from publishAt, which only schedules).
  // Typed in Santo Domingo time, stored as UTC. Past dates are fine; a future
  // one is rejected so it can't be confused with scheduling.
  const current = await prisma.post.findUnique({ where: { id: postId }, select: { publishedAt: true } });
  let publishedAt = fromAstInput(String(formData.get("publishedAt") ?? ""));
  if (current?.publishedAt) {
    // Unchanged (the form only has minute precision): keep the stored value with its seconds.
    // Cleared on an already-published post: keep the date rather than leave it undated.
    if (!publishedAt || toAstInput(current.publishedAt) === toAstInput(publishedAt)) publishedAt = current.publishedAt;
  }
  if (publishedAt && publishedAt.getTime() !== current?.publishedAt?.getTime() && publishedAt.getTime() > Date.now()) {
    throw new Error("La fecha de publicación no puede estar en el futuro. Para programar usa «Publicar el».");
  }

  const blocksRaw = parseBlocks(String(formData.get("blocksJson") ?? "[]"));
  const blocks = blocksRaw.map((b, i) => ({
    type: b.type,
    content: sanitizeBlockContent(b.type, b.content) as object,
    position: i,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: { title, slug, excerpt, featuredImage, seoTitle, seoDescription, tags, publishAt, publishedAt },
    });
    await tx.contentBlock.deleteMany({ where: { postId } });
    if (blocks.length > 0) {
      await tx.contentBlock.createMany({ data: blocks.map((b) => ({ ...b, postId })) });
    }
  });

  return slug;
}

export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const admin = await requireAdmin();
  const title = sanitizePlainText(String(formData.get("title") ?? "")).slice(0, 200) || "Nuevo post";
  const baseSlug = slugify(title) || "nuevo-post";

  let slug = baseSlug;
  let n = 1;
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const post = await prisma.post.create({ data: { title, slug } });
  await logAudit({ adminId: admin.id, action: "create_post", entityType: "Post", entityId: post.id, detail: { entity: `Entrada «${post.title}»`, summary: `Dirección /blog/${post.slug}` } });
  redirect(`/admin/posts/${post.id}`);
}

export async function savePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const admin = await requireAdmin();
  const postId = String(formData.get("postId") ?? "");
  const intent = String(formData.get("intent") ?? "draft");

  const before = (await safely(() => loadPostForAudit(postId))) ?? null;
  let slug: string;
  try {
    slug = await upsertPostContent(postId, formData);
    if (intent === "publish") await publishPost(postId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar." };
  }

  await logAudit({
    adminId: admin.id,
    action: intent === "publish" ? "publish_post" : "save_draft",
    entityType: "Post",
    entityId: postId,
    detail: await safely(async () => describePostChange(before, await loadPostForAudit(postId), intent === "publish" ? "Guardó y publicó" : "Guardó el borrador")),
  });
  revalidatePath("/admin/posts");
  if (intent === "publish") {
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
  }
  return { postId, savedAt: Date.now() };
}

export async function deletePost(postId: string) {
  const admin = await requireAdmin();
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { title: true, slug: true, status: true } });
  await prisma.post.delete({ where: { id: postId } });
  await logAudit({
    adminId: admin.id,
    action: "delete_post",
    entityType: "Post",
    entityId: postId,
    detail: post ? { entity: `Entrada «${post.title}»`, summary: `Se eliminó la entrada /blog/${post.slug} (${POST_STATUS[post.status]})` } : undefined,
  });
  revalidatePath("/admin/posts");
}
