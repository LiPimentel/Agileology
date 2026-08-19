import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Dashboard — Backoffice" };

export default async function AdminDashboardPage() {
  const [pages, posts, newChats, newSubmissions, visits7d] = await Promise.all([
    prisma.page.count(),
    prisma.post.count(),
    prisma.chatMessage.count({ where: { status: "new" } }),
    prisma.contactFormSubmission.count({ where: { status: "new" } }),
    prisma.visitLog.count({ where: { timestamp: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
  ]);

  const cards = [
    { label: "Páginas", value: pages, href: "/admin/pages" },
    { label: "Posts del blog", value: posts, href: "/admin/posts" },
    { label: "Visitas (7 días)", value: visits7d, href: "/admin/analytics" },
    { label: "Mensajes nuevos", value: newChats + newSubmissions, href: "/admin/inbox" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
    </div>
  );
}
