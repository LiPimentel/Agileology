import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageEditorForm } from "./PageEditorForm";

export const metadata = { title: "Editar página — Backoffice" };
export const dynamic = "force-dynamic";

export default async function PageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [page, mediaLibrary, allPages] = await Promise.all([
    prisma.page.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: { position: "asc" } },
        background: true,
        mapComponent: true,
        contactFormComponent: true,
      },
    }),
    prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.page.findMany({ select: { slug: true, title: true }, orderBy: { title: "asc" } }),
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
          ? { imageUrl: page.background.imageUrl, overlayColor: page.background.overlayColor, overlayOpacity: page.background.overlayOpacity }
          : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blocks: page.blocks.map((b) => ({ id: b.id, type: b.type, content: b.content as any })),
        mapComponent: page.mapComponent ? { address: page.mapComponent.address } : null,
        contactFormComponent: page.contactFormComponent ? { enabledFields: page.contactFormComponent.enabledFields } : null,
      }}
      mediaLibrary={mediaLibrary}
      pages={allPages}
    />
  );
}
