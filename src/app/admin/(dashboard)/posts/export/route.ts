import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminListPosts } from "@/lib/posts";
import { toCsv } from "@/lib/csv";

const STATUS_LABEL: Record<string, string> = { draft: "Borrador", published: "Publicado" };

/** CSV export for the admin posts list (RF-style: "descarga de csv que incluya nombre de la publicación, estatus, fecha publicada"). */
export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const posts = await adminListPosts({
    q: searchParams.get("q") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const rows = [
    ["Título", "Estado", "Fecha publicada"],
    ...posts.map((p) => [
      p.title,
      STATUS_LABEL[p.status] ?? p.status,
      p.publishedAt ? p.publishedAt.toISOString().slice(0, 10) : "",
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="publicaciones-blog.csv"`,
    },
  });
}
