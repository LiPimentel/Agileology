import { prisma } from "@/lib/prisma";
import { MenuForm } from "./MenuForm";

export const metadata = { title: "Menú del sitio — Backoffice" };
export const dynamic = "force-dynamic";

export default async function MenuSettingsPage() {
  const [items, pages] = await Promise.all([
    prisma.menuItem.findMany({ orderBy: { order: "asc" }, include: { page: { select: { id: true, title: true, slug: true } } } }),
    prisma.page.findMany({ where: { status: "published" }, select: { id: true, title: true, slug: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Menú del sitio</h1>
      <p className="mb-6 text-sm text-slate-500">
        Controla qué aparece en el menú de navegación del header: páginas del sitio o enlaces a cualquier URL (externa
        o interna).
      </p>
      <MenuForm
        initialItems={items.map((i) => ({
          id: i.id,
          label: i.label,
          linkType: i.linkType === "page" ? "page" : "url",
          pageId: i.pageId,
          externalUrl: i.externalUrl ?? "",
          newTab: i.newTab,
          visible: i.visible,
        }))}
        pages={pages}
      />
    </div>
  );
}
