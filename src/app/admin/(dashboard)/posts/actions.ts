"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sanitizeBlockContent } from "@/lib/blocks";
import { sanitizePlainText } from "@/lib/sanitize";
import { publishPost } from "@/lib/posts";
import { slugify } from "@/lib/slugify";

export type PostFormState = { error?: string; postId?: string; savedAt?: number };

type SubmittedBlock = { type: "text" | "image" | "link" | "video"; content: unknown };

function parseBlocks(raw: string): SubmittedBlock[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function upsertPostContent(postId: string, formData: FormData) {
  const title = sanitizePlainText(String(formData.get("title") ?? "")).slice(0, 200);
  const slug = slugify(String(formData.get("slug") ?? "") || title);
  if (!title) throw new Error("El título es requerido.");
  if (!slug) throw new Error("El slug es requerido.");

  const existing = await prisma.post.findUnique({ where: { slug } });
  if (existing && existing.id !== postId) throw new Error("Ya existe otro post con ese slug.");

  const excerpt = sanitizePlainText(String(formData.get("excerpt") ?? "")) || null;
  const featuredImage = String(formData.get("featuredImage") ?? "") || null;
  const seoTitle = sanitizePlainText(String(formData.get("seoTitle") ?? "")) || null;
  const seoDescription = sanitizePlainText(String(formData.get("seoDescription") ?? "")) || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => sanitizePlainText(t.trim()))
    .filter(Boolean);
  const publishAtRaw = String(formData.get("publishAt") ?? "");
  const publishAt = publishAtRaw ? new Date(publishAtRaw) : null;

  const blocksRaw = parseBlocks(String(formData.get("blocksJson") ?? "[]"));
  const blocks = blocksRaw.map((b, i) => ({
    type: b.type,
    content: sanitizeBlockContent(b.type, b.content) as object,
    position: i,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: { title, slug, excerpt, featuredImage, seoTitle, seoDescription, tags, publishAt },
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
  await logAudit({ adminId: admin.id, action: "create_post", entityType: "Post", entityId: post.id });
  redirect(`/admin/posts/${post.id}`);
}

export async function savePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const admin = await requireAdmin();
  const postId = String(formData.get("postId") ?? "");
  const intent = String(formData.get("intent") ?? "draft");

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
  await prisma.post.delete({ where: { id: postId } });
  await logAudit({ adminId: admin.id, action: "delete_post", entityType: "Post", entityId: postId });
  revalidatePath("/admin/posts");
}
