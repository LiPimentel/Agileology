import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/date";

export const metadata = { title: "Dashboard — Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const since30d = daysAgo(30);

  const [pages, posts, totalChats, totalSubmissions, visits7d, recentPosts, topPageviews] = await Promise.all([
    prisma.page.count(),
    prisma.post.count(),
    prisma.chatMessage.count(),
    prisma.contactFormSubmission.count(),
    prisma.visitLog.count({ where: { timestamp: { gte: daysAgo(7) }, eventType: "pageview" } }),
    prisma.post.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, title: true, status: true } }),
    prisma.visitLog.groupBy({
      by: ["pageId"],
      where: { timestamp: { gte: since30d }, eventType: "pageview", pageId: { not: null } },
      _count: { pageId: true },
      orderBy: { _count: { pageId: "desc" } },
      take: 4,
    }),
  ]);

  // groupBy only returns pageId + count, not the page's own title/slug --
  // one more query to resolve those, keeping the ordering groupBy already gave us.
  const topPages = await prisma.page.findMany({
    where: { id: { in: topPageviews.map((v) => v.pageId as string) } },
    select: { id: true, title: true },
  });
  const topPagesRanked = topPageviews
    .map((v) => ({ page: topPages.find((p) => p.id === v.pageId), count: v._count.pageId }))
    .filter((r): r is { page: { id: string; title: string }; count: number } => Boolean(r.page));

  const cards = [
    { label: "Páginas", value: pages, href: "/admin/pages" },
    { label: "Posts del blog", value: posts, href: "/admin/posts" },
    { label: "Visitas (7 días)", value: visits7d, href: "/admin/analytics" },
    // Split from the old combined "Mensajes nuevos" card -- "cantidad de
    // mensajes recibidos y cantidad de correos enviados por el formulario
    // de contacto" asked for these as their own separate numbers.
    { label: "Mensajes de chat", value: totalChats, href: "/admin/inbox" },
    { label: "Envíos de formulario", value: totalSubmissions, href: "/admin/inbox" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-slate-200 bg-white p-5 hover:border-violet-300 hover:shadow-sm"
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold text-violet-800">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Posts recientes</h2>
            <Link href="/admin/posts" className="text-sm text-violet-700 hover:underline">
              Ver todos
            </Link>
          </div>
          {recentPosts.length === 0 ? (
            <p className="text-sm text-slate-500">Sin publicaciones todavía.</p>
          ) : (
            <ul className="space-y-2">
              {recentPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/posts/${p.id}`} className="font-medium text-violet-700 hover:underline">
                    {p.title}
                  </Link>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {p.status === "published" ? "Publicado" : "Borrador"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Páginas más visitadas</h2>
            <Link href="/admin/analytics" className="text-sm text-violet-700 hover:underline">
              Ver analítica
            </Link>
          </div>
          {topPagesRanked.length === 0 ? (
            <p className="text-sm text-slate-500">Sin visitas todavía.</p>
          ) : (
            <ul className="space-y-2">
              {topPagesRanked.map(({ page, count }) => (
                <li key={page.id} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/pages/${page.id}`} className="font-medium text-violet-700 hover:underline">
                    {page.title}
                  </Link>
                  <span className="font-medium text-slate-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
