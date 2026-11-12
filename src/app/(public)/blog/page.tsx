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

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  const { q, tag } = await searchParams;
  const [{ posts }, blogSettings, tags] = await Promise.all([listPublishedPosts({ q, tag, take: 24 }), getBlogSettings(), publicPostTags()]);
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
          <Link href={q ? `/blog?q=${encodeURIComponent(q)}` : "/blog"} aria-current={!tag ? "true" : undefined}
            className={`${chip} ${!tag ? "border-violet-700 bg-violet-700 text-white" : "border-slate-300 text-slate-700 hover:border-violet-700"}`}>
            Todos
          </Link>
          {tags.map((t) => (
            <Link key={t.tag} href={`/blog?tag=${encodeURIComponent(t.tag)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={tag === t.tag ? "true" : undefined}
              className={`${chip} ${tag === t.tag ? "border-violet-700 bg-violet-700 text-white" : "border-slate-300 text-slate-700 hover:border-violet-700"}`}>
              {t.tag} <span className="opacity-70">({t.count})</span>
            </Link>
          ))}
        </nav>
      )}

      {posts.length === 0 && <p className="text-slate-500">No hay publicaciones todavía.</p>}

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
    </div>
  );
}
