import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { groupBlocksIntoSections } from "@/lib/sections";
import { PageEditorForm } from "./PageEditorForm";

export const metadata = { title: "Editar página — Backoffice" };
export const dynamic = "force-dynamic";

export default async function PageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [page, mediaLibrary, allPages, formDefinitions] = await Promise.all([
    prisma.page.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: [{ position: "asc" }, { columnIndex: "asc" }, { blockOrder: "asc" }] },
        background: true,
      },
    }),
    prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.page.findMany({ select: { id: true, slug: true, title: true }, orderBy: { title: "asc" } }),
    prisma.formDefinition.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!page) notFound();

  return (
    <PageEditorForm
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        menuOrder: page.menuOrder,
        showInMenu: page.showInMenu,
        menuVisible: page.menuVisible,
        isSystem: page.isSystem,
        background: page.background
          ? {
              imageUrl: page.background.imageUrl,
              overlayColor: page.background.overlayColor,
              overlayOpacity: page.background.overlayOpacity,
              bannerImageUrl: page.background.bannerImageUrl,
              showBanner: page.background.showBanner,
              showTitle: page.background.showTitle,
            }
          : null,
        sections: groupBlocksIntoSections(
          page.blocks.map((b) => ({
            id: b.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: b.type as any,
            content: b.content,
            position: b.position,
            columnIndex: b.columnIndex,
            columnWidth: b.columnWidth,
            sectionBgImageUrl: b.sectionBgImageUrl,
            sectionBgColor: b.sectionBgColor,
            sectionBgOpacity: b.sectionBgOpacity,
            sectionBgVideoUrl: b.sectionBgVideoUrl,
            sectionBgGradientEnd: b.sectionBgGradientEnd,
            sectionLayoutMode: b.sectionLayoutMode,
            sectionFreeHeight: b.sectionFreeHeight,
            freeX: b.freeX,
            freeY: b.freeY,
            freeWidth: b.freeWidth,
            freeHeight: b.freeHeight,
            freeZIndex: b.freeZIndex,
          })),
        ),
      }}
      mediaLibrary={mediaLibrary}
      pages={allPages}
      formDefinitions={formDefinitions}
    />
  );
}
