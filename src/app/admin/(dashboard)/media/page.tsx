import { prisma } from "@/lib/prisma";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { MediaGrid } from "@/components/admin/MediaGrid";

export const metadata = { title: "Medios — Backoffice" };
export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const items = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Biblioteca de medios</h1>
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <MediaUploadForm />
      </div>
      <MediaGrid items={items} />
    </div>
  );
}
