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
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Menú del sitio</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Controla qué aparece en el menú superior (header) y en los enlaces extra del pie de página (footer): páginas
        del sitio o enlaces a cualquier URL (externa o interna). Un enlace del menú superior puede tener submenú
        (dropdown); los del pie de página no.
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
          parentId: i.parentId,
          location: i.location === "footer" ? "footer" : "header",
        }))}
        pages={pages}
      />
    </div>
  );
}
