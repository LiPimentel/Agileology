import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { listPublishedPosts, publicPostTags } from "@/lib/posts";
import { getBlogSettings } from "@/lib/settings";
import { formatAstDate } from "@/lib/date";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blog",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; tag?: string | string[]; page?: string | string[] }> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined;
  const tag = typeof sp.tag === "string" ? sp.tag.slice(0, 50) : undefined;
  const PAGE_SIZE = 15;
  const requested = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 1000) : 1;
  const [{ posts, total }, blogSettings, tags] = await Promise.all([
    listPublishedPosts({ q, tag, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    getBlogSettings(),
    publicPostTags(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (q) params.set("q", q);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/blog?${qs}` : "/blog";
  };
  const chip = "rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Blog</h1>

      <form className="mb-8 max-w-sm">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar en el blog..."
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </form>

      {tags.length > 0 && (
        <nav aria-label="Filtrar por tema" className="mb-8 flex flex-wrap gap-2">
          <Link href={q ? `/blog?q=${encodeURIComponent(q)}` : "/blog"} aria-current={!tag ? "page" : undefined}
            className={`${chip} ${!tag ? "border-violet-700 bg-violet-700 text-white" : "border-slate-400 text-slate-700 hover:border-violet-700"}`}>
            Todos
          </Link>
          {tags.map((t) => (
            <Link key={t.tag} href={`/blog?tag=${encodeURIComponent(t.tag)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={tag === t.tag ? "page" : undefined}
              className={`${chip} ${tag === t.tag ? "border-violet-700 bg-violet-700 text-white" : "border-slate-400 text-slate-700 hover:border-violet-700"}`}>
              {t.tag} <span className={tag === t.tag ? "" : "opacity-70"}>({t.count})</span>
            </Link>
          ))}
        </nav>
      )}

      {posts.length === 0 && (
        <p className="text-slate-500">
          {tag || q ? (<>No hay publicaciones con ese filtro. <Link href="/blog" className="text-violet-700 underline">Ver todas</Link></>) : "No hay publicaciones todavía."}
        </p>
      )}

      {blogSettings.layoutType === "grid" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
              {p.featuredImage && (
                <Image src={p.featuredImage} alt="" width={400} height={250} className="h-40 w-full object-cover" />
              )}
              <div className="p-4">
                <h2 className="font-semibold text-slate-900 group-hover:text-violet-700">{p.title}</h2>
                {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.excerpt}</p>}
                {p.publishedAt && (
                  <p className="mt-2 text-xs text-slate-400">{formatAstDate(p.publishedAt)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group flex gap-4 py-5">
              {p.featuredImage && (
                <Image src={p.featuredImage} alt="" width={120} height={90} className="h-24 w-32 shrink-0 rounded-md object-cover" />
              )}
              <div>
                <h2 className="font-semibold text-slate-900 group-hover:text-violet-700">{p.title}</h2>
                {p.excerpt && <p className="mt-1 text-sm text-slate-600">{p.excerpt}</p>}
                {p.publishedAt && (
                  <p className="mt-2 text-xs text-slate-400">{formatAstDate(p.publishedAt)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <nav aria-label="Paginación del blog" className="mt-10 flex items-center justify-between gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} rel="prev" className="rounded-md border border-slate-400 px-4 py-2 text-slate-700 hover:border-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">← Anteriores</Link>
          ) : <span />}
          <span className="text-slate-600">Página {Math.min(page, totalPages)} de {totalPages}</span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} rel="next" className="rounded-md border border-slate-400 px-4 py-2 text-slate-700 hover:border-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">Siguientes →</Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
