import "server-only";
import { prisma } from "@/lib/prisma";
import type { RenderableBlock } from "@/components/blocks/BlockRenderer";

const WORDS_PER_MINUTE = 238;

type SnapshotBlock = { type?: string; content?: { html?: string } };

function readingMinutes(snapshot: unknown): number {
  const blocks = (snapshot as { blocks?: SnapshotBlock[] } | null)?.blocks ?? [];
  const words = blocks
    .filter((b) => b.type === "text")
    .reduce((n, b) => n + String(b.content?.html ?? "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Fills each "latestPosts" block with the most recent published posts (newest first), so the
 * block stays current without editing the page: a newly published post enters the rotation on
 * its own. Shares the visibility rule of the public blog (published, not scheduled for later).
 */
export async function resolveLatestPostsBlocks(blocks: RenderableBlock[]): Promise<RenderableBlock[]> {
  const wanted = blocks.filter((b) => b.type === "latestPosts");
  if (wanted.length === 0) return blocks;
  const max = Math.min(6, Math.max(...wanted.map((b) => Number(b.content.count ?? 6))));

  const rows = await prisma.post.findMany({
    where: { status: "published", AND: [{ OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] }] },
    orderBy: { publishedAt: "desc" },
    take: max,
    select: {
      slug: true,
      title: true,
      featuredImage: true,
      publishedAt: true,
      versions: { orderBy: { createdAt: "desc" }, take: 1, select: { snapshot: true } },
    },
  });
  const posts = rows
    .filter((r) => r.publishedAt)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      image: r.featuredImage,
      publishedAt: r.publishedAt!.toISOString(),
      minutes: readingMinutes(r.versions[0]?.snapshot),
    }));

  return blocks.map((b) =>
    b.type === "latestPosts" ? { ...b, content: { ...b.content, posts: posts.slice(0, Math.min(6, Number(b.content.count ?? 6))) } } : b,
  );
}
