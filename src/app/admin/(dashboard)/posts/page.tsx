import Link from "next/link";
import { PostRowActions } from "@/components/admin/PostRowActions";
import { adminCountPosts, adminListPosts, adminPostTags, type AdminPostFilter } from "@/lib/posts";
import { formatAstDate, formatAstDateTime } from "@/lib/date";
import { ListFilterBar, type FilterField } from "@/components/admin/list/ListFilterBar";
import { Pagination } from "@/components/admin/list/Pagination";
import { SortableTh } from "@/components/admin/list/SortableTh";
import { PAGE_SIZE, buildQuery, oneOf, pageNumber, pick, type SearchParams } from "@/lib/listFilters";

export const metadata = { title: "Blog — Backoffice" };
export const dynamic = "force-dynamic";

const SORTS = ["", "title", "status", "createdAt", "publishedAt"] as const;

function DateCell({ value }: { value: Date | null }) {
  if (!value) return <span aria-label="Sin fecha">—</span>;
  return (
    <time dateTime={value.toISOString()} title={formatAstDateTime(value)}>
      {formatAstDate(value)}
    </time>
  );
}

export default async function PostsListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filter: AdminPostFilter = {
    q: pick(sp.q),
    from: pick(sp.from),
    to: pick(sp.to),
    pfrom: pick(sp.pfrom),
    pto: pick(sp.pto),
    status: oneOf(pick(sp.status), ["", "published", "draft"] as const, ""),
    tag: pick(sp.tag),
  };
  // No explicit sort = drafts first, then newest created.
  const sort = oneOf(pick(sp.sort), SORTS, "");
  const dir = oneOf(pick(sp.dir), ["asc", "desc"] as const, "desc");
  const page = pageNumber(sp.page);

  const [posts, total, drafts, published, tags] = await Promise.all([
    adminListPosts(filter, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, sort, dir }),
    adminCountPosts(filter),
    adminCountPosts({ ...filter, status: "draft" }),
    adminCountPosts({ ...filter, status: "published" }),
    adminPostTags(),
  ]);

  const params = { ...filter, sort, dir: sort ? dir : "" } as Record<string, string | undefined>;
  const values = { q: filter.q ?? "", status: filter.status ?? "", tag: filter.tag ?? "", from: filter.from ?? "", to: filter.to ?? "", pfrom: filter.pfrom ?? "", pto: filter.pto ?? "" };
  const fields: FilterField[] = [
    { type: "search", name: "q", label: "Buscar por título", placeholder: "Título..." },
    {
      type: "select",
      name: "status",
      label: "Estado",
      options: [
        { value: "", label: "Todos" },
        { value: "draft", label: "Borradores" },
        { value: "published", label: "Publicados" },
      ],
    },
    {
      type: "select",
      name: "tag",
      label: "Etiqueta",
      options: [{ value: "", label: "Todas" }, ...tags.map((t) => ({ value: t, label: t }))],
    },
    { type: "date", name: "from", label: "Creado desde" },
    { type: "date", name: "to", label: "Creado hasta" },
    { type: "date", name: "pfrom", label: "Publicado desde" },
    { type: "date", name: "pto", label: "Publicado hasta" },
  ];
  const th = { sort: sort || "", dir, basePath: "/admin/posts", params };
  const exportHref = `/admin/posts/export${buildQuery({ q: filter.q, from: filter.from, to: filter.to, pfrom: filter.pfrom, pto: filter.pto, status: filter.status, tag: filter.tag })}`;
  const statusLink = (status: string) => `/admin/posts${buildQuery(params, { status, page: undefined })}`;
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-violet-700 bg-violet-700 text-white dark:border-violet-500 dark:bg-violet-600" : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Blog</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/settings/blog"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Diseño del blog
          </Link>
          <Link
            href="/admin/posts/new"
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            Nuevo post
          </Link>
        </div>
      </div>

      <ListFilterBar fields={fields} values={values} resetHref="/admin/posts" hidden={{ sort: params.sort, dir: params.dir }}>
        <a
          href={exportHref}
          className="ml-auto rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ⬇ Descargar CSV
        </a>
      </ListFilterBar>

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        <Link href={statusLink("")} className={chip(!filter.status)} aria-current={!filter.status ? "true" : undefined}>
          Todos ({drafts + published})
        </Link>
        <Link href={statusLink("draft")} className={chip(filter.status === "draft")} aria-current={filter.status === "draft" ? "true" : undefined}>
          Borradores ({drafts})
        </Link>
        <Link href={statusLink("published")} className={chip(filter.status === "published")} aria-current={filter.status === "published" ? "true" : undefined}>
          Publicados ({published})
        </Link>
      </nav>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Entradas del blog</caption>
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <SortableTh label="Título" field="title" {...th} />
              <SortableTh label="Estado" field="status" {...th} />
              <th scope="col" className="px-4 py-3">Etiquetas</th>
              <SortableTh label="Creado" field="createdAt" {...th} />
              <SortableTh label="Publicado" field="publishedAt" {...th} />
              <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-600 dark:text-slate-400">
                  Ninguna entrada coincide con los filtros.
                </td>
              </tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  <Link href={`/admin/posts/${p.id}`} className="font-medium text-violet-700 hover:underline dark:text-sky-400">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${p.status === "published" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}
                  >
                    {p.status === "published" ? "Publicado" : "Borrador"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.tags.length ? p.tags.join(", ") : "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400"><DateCell value={p.createdAt} /></td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400"><DateCell value={p.publishedAt} /></td>
                <td className="px-4 py-3">
                  <PostRowActions postId={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/admin/posts" params={params} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
