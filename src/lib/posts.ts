import "server-only";
import { prisma } from "@/lib/prisma";
import type { RenderableBlock } from "@/components/blocks/BlockRenderer";

export type PostSnapshot = {
  id: string;
  title: string;
  excerpt: string | null;
  featuredImage: string | null;
  tags: string[];
  blocks: RenderableBlock[];
};

export async function buildPostSnapshot(postId: string): Promise<PostSnapshot | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { blocks: { orderBy: { position: "asc" } } },
  });
  if (!post) return null;

  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    featuredImage: post.featuredImage,
    tags: post.tags,
    blocks: post.blocks.map((b) => ({ id: b.id, type: b.type, content: b.content as Record<string, unknown> })),
  };
}

export async function publishPost(postId: string) {
  const snapshot = await buildPostSnapshot(postId);
  if (!snapshot) throw new Error("Post not found");

  await prisma.$transaction([
    prisma.postVersion.create({ data: { postId, snapshot: snapshot as object } }),
    prisma.post.update({ where: { id: postId }, data: { status: "published", publishedAt: new Date() } }),
  ]);
}

export async function getPublishedPostBySlug(slug: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, status: true, publishAt: true, publishedAt: true, seoTitle: true, seoDescription: true, tags: true },
  });
  if (!post || post.status !== "published") return null;
  if (post.publishAt && post.publishAt > new Date()) return null;

  const version = await prisma.postVersion.findFirst({ where: { postId: post.id }, orderBy: { createdAt: "desc" } });
  if (!version) return null;

  return {
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    publishedAt: post.publishedAt,
    snapshot: version.snapshot as unknown as PostSnapshot,
  };
}

export async function listPublishedPosts(opts: { q?: string; skip?: number; take?: number } = {}) {
  const where = {
    status: "published" as const,
    OR: opts.q
      ? [
          { title: { contains: opts.q, mode: "insensitive" as const } },
          { excerpt: { contains: opts.q, mode: "insensitive" as const } },
        ]
      : undefined,
    AND: [{ OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] }],
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: opts.skip ?? 0,
      take: opts.take ?? 12,
      select: { id: true, title: true, slug: true, excerpt: true, featuredImage: true, publishedAt: true, tags: true },
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total };
}

export type AdminPostFilter = { q?: string; from?: string; to?: string };

/**
 * Shared filter for the admin posts list AND its CSV export -- both need
 * the exact same query so "download CSV" reflects whatever's currently
 * filtered/visible, not the full unfiltered table. Date range is on
 * createdAt (always set, unlike publishedAt which is null for drafts) so
 * it works the same for drafts and published posts alike.
 */
export function adminPostListWhere(filter: AdminPostFilter) {
  const from = filter.from ? new Date(filter.from) : null;
  // Push "to" to the end of that calendar day so a same-day range (from=to)
  // actually includes posts created that day, not just at midnight.
  const to = filter.to ? new Date(`${filter.to}T23:59:59.999`) : null;

  return {
    title: filter.q ? { contains: filter.q, mode: "insensitive" as const } : undefined,
    createdAt:
      from || to
        ? {
            ...(from && !isNaN(from.getTime()) ? { gte: from } : {}),
            ...(to && !isNaN(to.getTime()) ? { lte: to } : {}),
          }
        : undefined,
  };
}

export async function adminListPosts(filter: AdminPostFilter) {
  return prisma.post.findMany({
    where: adminPostListWhere(filter),
    orderBy: { createdAt: "desc" },
  });
}
