import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageRowActions } from "@/components/admin/PageRowActions";

export const metadata = { title: "Páginas — Backoffice" };
export const dynamic = "force-dynamic";

export default async function PagesListPage() {
  const pages = await prisma.page.findMany({ orderBy: { menuOrder: "asc" } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Páginas</h1>
        <Link href="/admin/pages/new" className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800">
          Nueva página
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">En menú</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/pages/${p.id}`} className="font-medium text-violet-700 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">/{p.slug}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {p.status === "published" ? "Publicada" : "Borrador"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{p.showInMenu && p.menuVisible ? "Sí" : "No"}</td>
                <td className="px-4 py-3">
                  <PageRowActions pageId={p.id} isSystem={p.isSystem} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
