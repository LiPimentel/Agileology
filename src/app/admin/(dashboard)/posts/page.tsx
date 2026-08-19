import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostRowActions } from "@/components/admin/PostRowActions";

export const metadata = { title: "Blog — Backoffice" };
export const dynamic = "force-dynamic";

export default async function PostsListPage() {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Blog</h1>
        <div className="flex gap-3">
          <Link href="/admin/settings/blog" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white">
            Diseño del blog
          </Link>
          <Link href="/admin/posts/new" className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800">
            Nuevo post
          </Link>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Publicado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/posts/${p.id}`} className="font-medium text-violet-700 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {p.status === "published" ? "Publicado" : "Borrador"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("es") : "—"}
                </td>
                <td className="px-4 py-3">
                  <PostRowActions postId={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
