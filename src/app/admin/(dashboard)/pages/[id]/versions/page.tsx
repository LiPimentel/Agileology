import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VersionsList } from "./VersionsList";

export const metadata = { title: "Historial de versiones — Backoffice" };
export const dynamic = "force-dynamic";

export default async function PageVersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  const versions = await prisma.pageVersion.findMany({
    where: { pageId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Link href={`/admin/pages/${id}`} className="mb-3 inline-block text-sm text-violet-700 hover:underline dark:text-sky-400">
        ← Volver al editor
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Historial de versiones</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{page.title}</p>
      <VersionsList pageId={id} versions={versions.map((v) => ({ id: v.id, createdAt: v.createdAt.toISOString() }))} />
    </div>
  );
}
