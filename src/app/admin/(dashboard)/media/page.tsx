import { prisma } from "@/lib/prisma";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { ListFilterBar, type FilterField } from "@/components/admin/list/ListFilterBar";
import { Pagination } from "@/components/admin/list/Pagination";
import { dayRange, oneOf, pageNumber, pick, type SearchParams } from "@/lib/listFilters";

export const metadata = { title: "Medios — Backoffice" };
export const dynamic = "force-dynamic";

const MEDIA_PAGE_SIZE = 48;

export default async function MediaLibraryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = pick(sp.q);
  const type = oneOf(pick(sp.type), ["", "image", "video"] as const, "");
  const from = pick(sp.from);
  const to = pick(sp.to);
  const page = pageNumber(sp.page);
  const range = dayRange(from, to);

  const where = {
    ...(type === "video" ? { mimeType: { startsWith: "video/" } } : type === "image" ? { NOT: { mimeType: { startsWith: "video/" } } } : {}),
    ...(range ? { createdAt: range } : {}),
    ...(q ? { OR: [{ altText: { contains: q, mode: "insensitive" as const } }, { filename: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * MEDIA_PAGE_SIZE, take: MEDIA_PAGE_SIZE }),
    prisma.media.count({ where }),
  ]);

  const params = { q, type, from, to };
  const fields: FilterField[] = [
    { type: "search", name: "q", label: "Buscar (texto alternativo o nombre)", placeholder: "Texto..." },
    {
      type: "select",
      name: "type",
      label: "Tipo",
      options: [
        { value: "", label: "Todos" },
        { value: "image", label: "Imágenes" },
        { value: "video", label: "Videos" },
      ],
    },
    { type: "date", name: "from", label: "Subido desde" },
    { type: "date", name: "to", label: "Subido hasta" },
  ];

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

      <ListFilterBar fields={fields} values={params} resetHref="/admin/media" />
      <MediaGrid items={items} />
      <Pagination basePath="/admin/media" params={params} page={page} pageSize={MEDIA_PAGE_SIZE} total={total} />
    </div>
  );
}
