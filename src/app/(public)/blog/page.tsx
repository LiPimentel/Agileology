import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { listPublishedPosts } from "@/lib/posts";
import { getBlogSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blog",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [{ posts }, blogSettings] = await Promise.all([listPublishedPosts({ q, take: 24 }), getBlogSettings()]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Blog</h1>

      <form className="mb-8 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar en el blog..."
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </form>

      {posts.length === 0 && <p className="text-slate-500">No hay publicaciones todavía.</p>}

      {blogSettings.layoutType === "grid" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
              {p.featuredImage && (
                <Image src={p.featuredImage} alt="" width={400} height={250} unoptimized className="h-40 w-full object-cover" />
              )}
              <div className="p-4">
                <h2 className="font-semibold text-slate-900 group-hover:text-violet-700">{p.title}</h2>
                {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.excerpt}</p>}
                {p.publishedAt && (
                  <p className="mt-2 text-xs text-slate-400">{new Date(p.publishedAt).toLocaleDateString("es")}</p>
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
                <Image src={p.featuredImage} alt="" width={120} height={90} unoptimized className="h-24 w-32 shrink-0 rounded-md object-cover" />
              )}
              <div>
                <h2 className="font-semibold text-slate-900 group-hover:text-violet-700">{p.title}</h2>
                {p.excerpt && <p className="mt-1 text-sm text-slate-600">{p.excerpt}</p>}
                {p.publishedAt && (
                  <p className="mt-2 text-xs text-slate-400">{new Date(p.publishedAt).toLocaleDateString("es")}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
