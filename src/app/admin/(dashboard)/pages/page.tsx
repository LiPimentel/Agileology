import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageRowActions } from "@/components/admin/PageRowActions";
import { ListFilterBar, type FilterField } from "@/components/admin/list/ListFilterBar";
import { Pagination } from "@/components/admin/list/Pagination";
import { SortableTh } from "@/components/admin/list/SortableTh";
import { formatAstDate, formatAstDateTime } from "@/lib/date";
import { PAGE_SIZE, dayRange, oneOf, pageNumber, pick, type SearchParams } from "@/lib/listFilters";

export const metadata = { title: "Páginas — Backoffice" };
export const dynamic = "force-dynamic";

const SORTS = ["title", "slug", "status", "createdAt", "publishedAt"] as const;

function DateCell({ value }: { value: Date | null }) {
  if (!value) return <span aria-label="Sin fecha">—</span>;
  return (
    <time dateTime={value.toISOString()} title={formatAstDateTime(value)}>
      {formatAstDate(value)}
    </time>
  );
}

export default async function PagesListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = pick(sp.q);
  const status = oneOf(pick(sp.status), ["", "published", "draft"] as const, "");
  const from = pick(sp.from);
  const to = pick(sp.to);
  const pfrom = pick(sp.pfrom);
  const pto = pick(sp.pto);
  const sort = oneOf(pick(sp.sort), SORTS, "createdAt");
  const dir = oneOf(pick(sp.dir), ["asc", "desc"] as const, "desc");
  const page = pageNumber(sp.page);

  const where = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(status ? { status } : {}),
    ...(dayRange(from, to) ? { createdAt: dayRange(from, to) } : {}),
    ...(dayRange(pfrom, pto) ? { publishedAt: dayRange(pfrom, pto) } : {}),
  };
  const orderBy = sort === "publishedAt" ? [{ publishedAt: { sort: dir, nulls: "last" as const } }] : [{ [sort]: dir }, { createdAt: "desc" as const }];

  const [pages, total] = await Promise.all([
    prisma.page.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.page.count({ where }),
  ]);

  const params = { q, status, from, to, pfrom, pto, sort: sp.sort ? sort : "", dir: sp.dir ? dir : "" };
  const values = { q, status, from, to, pfrom, pto };
  const fields: FilterField[] = [
    { type: "search", name: "q", label: "Buscar (título o dirección)", placeholder: "Título o slug..." },
    {
      type: "select",
      name: "status",
      label: "Estado",
      options: [
        { value: "", label: "Todos" },
        { value: "published", label: "Publicadas" },
        { value: "draft", label: "Borradores" },
      ],
    },
    { type: "date", name: "from", label: "Creada desde" },
    { type: "date", name: "to", label: "Creada hasta" },
    { type: "date", name: "pfrom", label: "Publicada desde" },
    { type: "date", name: "pto", label: "Publicada hasta" },
  ];
  const th = { sort, dir, basePath: "/admin/pages", params };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Páginas</h1>
        <Link
          href="/admin/pages/new"
          className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          Nueva página
        </Link>
      </div>

      <ListFilterBar fields={fields} values={values} resetHref="/admin/pages" hidden={{ sort: params.sort, dir: params.dir }} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Páginas del sitio</caption>
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <SortableTh label="Título" field="title" {...th} />
              <SortableTh label="Slug" field="slug" {...th} />
              <SortableTh label="Estado" field="status" {...th} />
              <SortableTh label="Creada" field="createdAt" {...th} />
              <SortableTh label="Publicada" field="publishedAt" {...th} />
              <th scope="col" className="px-4 py-3">En menú</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-600 dark:text-slate-400">
                  Ninguna página coincide con los filtros.
                </td>
              </tr>
            )}
            {pages.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  <Link href={`/admin/pages/${p.id}`} className="font-medium text-violet-700 hover:underline dark:text-sky-400">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">/{p.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${p.status === "published" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}
                  >
                    {p.status === "published" ? "Publicada" : "Borrador"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400"><DateCell value={p.createdAt} /></td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400"><DateCell value={p.publishedAt} /></td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.showInMenu && p.menuVisible ? "Sí" : "No"}</td>
                <td className="px-4 py-3">
                  <PageRowActions pageId={p.id} isSystem={p.isSystem} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/admin/pages" params={params} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
