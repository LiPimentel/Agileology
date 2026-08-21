import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildPageSnapshot } from "@/lib/pages";
import { resolveCustomFormBlocks } from "@/lib/forms";
import { PageRenderer } from "@/components/public/PageRenderer";

export const metadata = { title: "Vista previa" };
export const dynamic = "force-dynamic";

export default async function PagePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const snapshot = await buildPageSnapshot(id);
  if (!snapshot) notFound();
  const blocks = await resolveCustomFormBlocks(snapshot.blocks);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950">
        Vista previa — así se vería si publicas ahora. Esto todavía no está en vivo.
      </div>
      <PageRenderer page={{ ...snapshot, blocks }} />
    </div>
  );
}
