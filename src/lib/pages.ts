import "server-only";
import { prisma } from "@/lib/prisma";
import type { PageRenderData } from "@/components/public/PageRenderer";

/** Builds the "what would go live" snapshot from the current working (draft) rows. */
export async function buildPageSnapshot(pageId: string): Promise<PageRenderData | null> {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      blocks: { orderBy: { position: "asc" } },
      background: true,
      mapComponent: true,
      contactFormComponent: true,
    },
  });
  if (!page) return null;

  return {
    id: page.id,
    title: page.title,
    blocks: page.blocks.map((b) => ({ id: b.id, type: b.type, content: b.content as Record<string, unknown> })),
    background: page.background
      ? { imageUrl: page.background.imageUrl, overlayColor: page.background.overlayColor, overlayOpacity: page.background.overlayOpacity }
      : null,
    mapComponent: page.mapComponent ? { address: page.mapComponent.address } : null,
    contactFormComponent: page.contactFormComponent
      ? { enabledFields: page.contactFormComponent.enabledFields }
      : null,
  };
}

/** RF-20–RF-22: publishes the current draft as a new immutable version and flips the page live. */
export async function publishPage(pageId: string) {
  const snapshot = await buildPageSnapshot(pageId);
  if (!snapshot) throw new Error("Page not found");

  await prisma.$transaction([
    prisma.pageVersion.create({ data: { pageId, snapshot: snapshot as object } }),
    prisma.page.update({ where: { id: pageId }, data: { status: "published", publishedAt: new Date() } }),
  ]);
}

/** Public site reads the last published snapshot, never the live draft rows (RF-20). */
export async function getPublishedPageBySlug(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
    select: { id: true, status: true, seoTitle: true, seoDescription: true },
  });
  if (!page || page.status !== "published") return null;

  const version = await prisma.pageVersion.findFirst({
    where: { pageId: page.id },
    orderBy: { createdAt: "desc" },
  });
  if (!version) return null;

  return {
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    snapshot: version.snapshot as unknown as PageRenderData,
  };
}
