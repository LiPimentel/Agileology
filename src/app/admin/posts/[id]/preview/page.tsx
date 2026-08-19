import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildPostSnapshot } from "@/lib/posts";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";

export const metadata = { title: "Vista previa" };
export const dynamic = "force-dynamic";

export default async function PostPreview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const snapshot = await buildPostSnapshot(id);
  if (!snapshot) notFound();

  return (
    <div>
      <div className="sticky top-0 z-10 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950">
        Vista previa — así se vería si publicas ahora. Esto todavía no está en vivo.
      </div>
      <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        <h1 className="text-4xl font-bold text-slate-900">{snapshot.title}</h1>
        {snapshot.blocks.map((block, i) => (
          <BlockRenderer key={block.id ?? i} block={block} />
        ))}
      </article>
    </div>
  );
}
