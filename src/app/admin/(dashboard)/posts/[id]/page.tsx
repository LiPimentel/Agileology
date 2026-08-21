import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { EditorBlock } from "@/components/admin/BlockEditor";
import { PostEditorForm } from "./PostEditorForm";

export const metadata = { title: "Editar post — Backoffice" };
export const dynamic = "force-dynamic";

function toLocalInput(date: Date | null) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function PostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [post, mediaLibrary, pages] = await Promise.all([
    prisma.post.findUnique({ where: { id }, include: { blocks: { orderBy: { position: "asc" } } } }),
    prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.page.findMany({ select: { slug: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  if (!post) notFound();

  return (
    <PostEditorForm
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        excerpt: post.excerpt,
        featuredImage: post.featuredImage,
        tags: post.tags,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        publishAt: toLocalInput(post.publishAt),
        // Blog posts only ever contain text/image/link/video blocks (map/
        // contactForm are pages-only, added through the section editor) --
        // the DB-level BlockType enum is shared across both, so this cast
        // is safe in practice even though the type system can't express
        // "this table's rows are a subset of that enum" on its own.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blocks: post.blocks.map((b) => ({ id: b.id, type: b.type, content: b.content as any })) as EditorBlock[],
      }}
      mediaLibrary={mediaLibrary}
      pages={pages}
    />
  );
}
