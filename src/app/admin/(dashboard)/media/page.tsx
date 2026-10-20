import { prisma } from "@/lib/prisma";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { MediaGrid } from "@/components/admin/MediaGrid";

export const metadata = { title: "Medios — Backoffice" };
export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const items = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Biblioteca de medios</h1>
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {/*
          MediaUploadForm no longer renders its own <form> (that was the fix
          for it being nested inside a bigger form elsewhere -- see that
          component). Here it's used standalone, so it needs an actual
          enclosing <form> to submit through at all; the button's own
          formAction (inside MediaUploadForm) still decides where it
          actually goes, this one needs no action of its own.
        */}
        <form>
          <MediaUploadForm />
        </form>
      </div>
      <MediaGrid items={items} />
    </div>
  );
}
