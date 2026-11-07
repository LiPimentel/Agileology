import "server-only";
import { resolveCustomFormBlocks } from "@/lib/forms";
import { resolveLatestPostsBlocks } from "@/lib/latestPosts";
import type { RenderableBlock } from "@/components/blocks/BlockRenderer";

/** Fills in every block whose content is looked up at render time (library forms, latest posts). */
export async function resolveDynamicBlocks(blocks: RenderableBlock[]): Promise<RenderableBlock[]> {
  return resolveLatestPostsBlocks(await resolveCustomFormBlocks(blocks));
}
