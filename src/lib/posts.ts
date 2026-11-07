import "server-only";
import { prisma } from "@/lib/prisma";
import type { RenderableBlock } from "@/components/blocks/BlockRenderer";
import { dayRange } from "@/lib/listFilters";

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

  // Respect a publishedAt that was already set (an editor-fixed date, e.g. a
  // migrated post keeping its original date); only fall back to "now" when
  // there is none.
  const current = await prisma.post.findUnique({ where: { id: postId }, select: { publishedAt: true } });

  await prisma.$transaction([
    prisma.postVersion.create({ data: { postId, snapshot: snapshot as object } }),
    prisma.post.update({
      where: { id: postId },
      data: { status: "published", publishedAt: current?.publishedAt ?? new Date() },
    }),
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

export type AdminPostFilter = {
  q?: string;
  from?: string; // created from (day, Santo Domingo)
  to?: string; // created to
  pfrom?: string; // published from
  pto?: string; // published to
  status?: "draft" | "published" | "";
  tag?: string;
};

/**
 * Shared filter for the admin posts list AND its CSV export -- both need the exact same query
 * so "download CSV" reflects whatever is currently filtered, not the full table. Day ranges are
 * Santo Domingo days (see lib/listFilters.ts).
 */
export function adminPostListWhere(filter: AdminPostFilter) {
  const created = dayRange(filter.from ?? "", filter.to ?? "");
  const published = dayRange(filter.pfrom ?? "", filter.pto ?? "");
  return {
    title: filter.q ? { contains: filter.q, mode: "insensitive" as const } : undefined,
    status: filter.status === "draft" || filter.status === "published" ? filter.status : undefined,
    tags: filter.tag ? { has: filter.tag } : undefined,
    createdAt: created,
    publishedAt: published,
  };
}

export type AdminPostPaging = { skip?: number; take?: number; sort?: "title" | "status" | "createdAt" | "publishedAt" | ""; dir?: "asc" | "desc" };

export async function adminListPosts(filter: AdminPostFilter, paging: AdminPostPaging = {}) {
  const dir = paging.dir ?? "desc";
  // Default: drafts first (the ones being worked on), then newest created. An explicit sort wins.
  const orderBy =
    !paging.sort
      ? [{ status: "asc" as const }, { createdAt: "desc" as const }]
      : paging.sort === "publishedAt"
        ? [{ publishedAt: { sort: dir, nulls: "last" as const } }, { createdAt: "desc" as const }]
        : [{ [paging.sort]: dir }, { createdAt: "desc" as const }];
  return prisma.post.findMany({ where: adminPostListWhere(filter), orderBy, skip: paging.skip, take: paging.take });
}

export async function adminCountPosts(filter: AdminPostFilter) {
  return prisma.post.count({ where: adminPostListWhere(filter) });
}

/** Every tag in use, for the tag filter. */
export async function adminPostTags(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ tag: string }>>`select distinct unnest(tags) as tag from "Post" order by 1`;
  return rows.map((r) => r.tag);
}
