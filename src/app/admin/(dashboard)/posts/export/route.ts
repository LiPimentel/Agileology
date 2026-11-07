import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminListPosts } from "@/lib/posts";
import { toCsv } from "@/lib/csv";
import { toAstInput } from "@/lib/date";

const STATUS_LABEL: Record<string, string> = { draft: "Borrador", published: "Publicado" };

/** CSV export for the admin posts list (RF-style: "descarga de csv que incluya nombre de la publicación, estatus, fecha publicada"). */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  // Route handlers skip the dashboard layout, which is what sends accounts without 2FA to set it up.
  if (!admin.twoFactorEnabled) return new NextResponse("Activa la verificación en dos pasos para exportar.", { status: 403 });

  const { searchParams } = new URL(request.url);
  const posts = await adminListPosts({
    q: searchParams.get("q") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    pfrom: searchParams.get("pfrom") ?? undefined,
    pto: searchParams.get("pto") ?? undefined,
    status: (searchParams.get("status") as "draft" | "published" | null) ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
  });

  const rows = [
    ["Título", "Estado", "Fecha creada", "Fecha publicada"],
    ...posts.map((p) => [
      p.title,
      STATUS_LABEL[p.status] ?? p.status,
      toAstInput(p.createdAt).slice(0, 10),
      p.publishedAt ? toAstInput(p.publishedAt).slice(0, 10) : "",
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="publicaciones-blog.csv"`,
    },
  });
}
