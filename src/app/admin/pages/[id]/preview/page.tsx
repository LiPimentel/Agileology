import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildPageSnapshot } from "@/lib/pages";
import { resolveDynamicBlocks } from "@/lib/dynamicBlocks";
import { PageRenderer } from "@/components/public/PageRenderer";

export const metadata = { title: "Vista previa" };
export const dynamic = "force-dynamic";

export default async function PagePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const snapshot = await buildPageSnapshot(id);
  if (!snapshot) notFound();
  const blocks = await resolveDynamicBlocks(snapshot.blocks);

  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm text-amber-950">
        <span className="font-medium">Vista previa — así se vería si publicas ahora. Esto todavía no está en vivo.</span>
        <Link href={`/admin/pages/${id}`} className="rounded-md border border-slate-900/30 bg-white/70 px-3 py-1 font-medium text-slate-900 hover:bg-white">
          ← Volver al editor
        </Link>
      </div>
      <PageRenderer page={{ ...snapshot, blocks }} />
    </div>
  );
}
