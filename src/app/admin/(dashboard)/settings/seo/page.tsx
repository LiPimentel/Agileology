import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { SeoForm } from "./SeoForm";

export const metadata = { title: "SEO de las páginas — Backoffice" };
export const dynamic = "force-dynamic";

export default async function SeoSettingsPage() {
  const [pages, settings] = await Promise.all([
    prisma.page.findMany({
      select: { id: true, title: true, slug: true, status: true, seoTitle: true, seoDescription: true },
      orderBy: [{ status: "desc" }, { title: "asc" }], // published first
    }),
    getSiteSettings(),
  ]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">SEO de las páginas</h1>
      <p className="mb-6 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
        Lo que Google y las redes muestran de cada página: el título y la descripción. Aquí puedes revisarlas y editarlas todas juntas. Si dejas una en blanco, se usa un valor de reserva, que verás en gris.
      </p>
      <SeoForm pages={pages} siteTitle={settings.siteTitle} defaultDescription={settings.defaultMetaDescription ?? ""} />
    </div>
  );
}
