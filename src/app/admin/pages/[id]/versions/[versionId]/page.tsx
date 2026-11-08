import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { resolveDynamicBlocks } from "@/lib/dynamicBlocks";
import { PageRenderer, type PageRenderData } from "@/components/public/PageRenderer";
import { restorePageVersion } from "../../../../(dashboard)/pages/actions";

export const metadata = { title: "Versión anterior — Backoffice" };
export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("es", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santo_Domingo" });
const btn = "rounded-md border border-slate-900/30 bg-white/70 px-3 py-1 text-sm font-medium text-slate-900 hover:bg-white";

/** One saved version of a page, drawn exactly as it looked at the time (the whole page, not a list entry). */
export default async function PageVersionView({ params }: { params: Promise<{ id: string; versionId: string }> }) {
  await requireAdmin();
  const { id, versionId } = await params;
  const version = await prisma.pageVersion.findUnique({ where: { id: versionId } });
  if (!version || version.pageId !== id) notFound();
  const newest = await prisma.pageVersion.findFirst({ where: { pageId: id }, orderBy: { createdAt: "desc" }, select: { id: true } });
  const isCurrent = newest?.id === version.id;

  const snapshot = version.snapshot as unknown as PageRenderData;
  const blocks = await resolveDynamicBlocks(snapshot.blocks ?? []);

  async function restore() {
    "use server";
    await restorePageVersion(id, versionId);
    redirect(`/admin/pages/${id}`);
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm text-amber-950">
        <span className="font-medium">
          Versión del {when.format(version.createdAt)}
          {isCurrent ? " (la actual publicada)" : ""} — solo lectura
        </span>
        <Link href={`/admin/pages/${id}/versions`} className={btn}>← Historial</Link>
        <Link href={`/admin/pages/${id}`} className={btn}>← Volver al editor</Link>
        {!isCurrent && (
          <form action={restore}>
            <button type="submit" className={btn} title="Reemplaza tu borrador por esta versión. No se publica.">
              Restaurar como borrador
            </button>
          </form>
        )}
      </div>
      <PageRenderer page={{ ...snapshot, blocks }} />
    </div>
  );
}
