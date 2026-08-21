import Link from "next/link";
import { PostRowActions } from "@/components/admin/PostRowActions";
import { adminListPosts, type AdminPostFilter } from "@/lib/posts";

export const metadata = { title: "Blog — Backoffice" };
export const dynamic = "force-dynamic";

function PostsTable({ posts }: { posts: Awaited<ReturnType<typeof adminListPosts>> }) {
  if (posts.length === 0) {
    return <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Nada aquí.</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <tr>
          <th className="px-4 py-3">Título</th>
          <th className="px-4 py-3">Estado</th>
          <th className="px-4 py-3">Publicado</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody>
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
            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
              {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("es") : "—"}
            </td>
            <td className="px-4 py-3">
              <PostRowActions postId={p.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function PostsListPage({ searchParams }: { searchParams: Promise<AdminPostFilter> }) {
  const filter = await searchParams;
  const posts = await adminListPosts(filter);
  // Drafts always listed first ("Drafts siempre arriba") -- those are the
  // ones actively being worked on and most likely to need attention.
  const drafts = posts.filter((p) => p.status === "draft");
  const published = posts.filter((p) => p.status === "published");

  const exportQuery = new URLSearchParams();
  if (filter.q) exportQuery.set("q", filter.q);
  if (filter.from) exportQuery.set("from", filter.from);
  if (filter.to) exportQuery.set("to", filter.to);
  const hasFilter = Boolean(filter.q || filter.from || filter.to);

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

      <form
        className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        method="get"
      >
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Buscar por nombre</label>
          <input
            type="search"
            name="q"
            defaultValue={filter.q ?? ""}
            placeholder="Título..."
            className="mt-1 w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Creado desde</label>
          <input
            type="date"
            name="from"
            defaultValue={filter.from ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Creado hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={filter.to ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          Filtrar
        </button>
        {hasFilter && (
          <Link href="/admin/posts" className="text-sm text-slate-500 underline hover:text-violet-700 dark:text-slate-400 dark:hover:text-sky-400">
            Limpiar filtros
          </Link>
        )}
        <a
          href={`/admin/posts/export${exportQuery.toString() ? `?${exportQuery}` : ""}`}
          className="ml-auto rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ⬇ Descargar CSV
        </a>
      </form>

      <div className="space-y-4">
        <details open className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <summary className="cursor-pointer bg-amber-50 px-4 py-3 text-sm font-semibold text-slate-900 dark:bg-amber-950/40 dark:text-slate-100">
            Borradores ({drafts.length})
          </summary>
          <PostsTable posts={drafts} />
        </details>

        <details open className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <summary className="cursor-pointer bg-green-50 px-4 py-3 text-sm font-semibold text-slate-900 dark:bg-green-950/40 dark:text-slate-100">
            Publicados ({published.length})
          </summary>
          <PostsTable posts={published} />
        </details>
      </div>
    </div>
  );
}
