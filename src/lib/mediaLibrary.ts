import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Media shown in the editors' pickers: the newest 60 images plus the newest 20 videos, so videos
 * (few, but needed by the video block and section backgrounds) don't get pushed out by images.
 */
export async function loadMediaLibrary() {
  const [images, videos] = await Promise.all([
    prisma.media.findMany({ where: { NOT: { mimeType: { startsWith: "video/" } } }, orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.media.findMany({ where: { mimeType: { startsWith: "video/" } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return [...images, ...videos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
