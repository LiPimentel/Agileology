import "server-only";
import { resolveCustomFormBlocks } from "@/lib/forms";
import { resolveLatestPostsBlocks } from "@/lib/latestPosts";
import { resolveEmbedOrigin } from "@/lib/embedOrigin";
import type { RenderableBlock } from "@/components/blocks/BlockRenderer";

/** Fills in every block whose content is looked up at render time (library forms, latest posts). */
export async function resolveDynamicBlocks(blocks: RenderableBlock[]): Promise<RenderableBlock[]> {
  const resolved = await resolveLatestPostsBlocks(await resolveCustomFormBlocks(blocks));
  // Where the LinkedIn widget frame is served from (null = not configured; the block then shows a note).
  const embedOrigin = resolveEmbedOrigin(process.env.EMBED_ORIGIN, process.env.NEXT_PUBLIC_SITE_URL);
  return resolved.map((b) => (b.type === "linkedinPosts" ? { ...b, content: { ...b.content, embedOrigin: embedOrigin ?? "" } } : b));
}
