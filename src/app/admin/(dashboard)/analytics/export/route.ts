import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/date";
import { toCsv } from "@/lib/csv";

const RANGES: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** CSV export for the analytics dashboard -- one file, several sections, mirroring exactly what the dashboard shows for the same date range. */
export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const days = RANGES[searchParams.get("range") ?? "7d"] ?? 7;
  const since = daysAgo(days);

  const [byPath, byBlogPath, byLabel, logs] = await Promise.all([
    prisma.visitLog.groupBy({
      by: ["path"],
      where: { timestamp: { gte: since }, eventType: "pageview" },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
    }),
    prisma.visitLog.groupBy({
      by: ["path"],
      where: { timestamp: { gte: since }, eventType: "pageview", path: { startsWith: "/blog/" } },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
    }),
    prisma.visitLog.groupBy({
      by: ["label"],
      where: { timestamp: { gte: since }, eventType: "click", label: { not: null } },
      _count: { label: true },
      orderBy: { _count: { label: "desc" } },
    }),
    prisma.visitLog.findMany({ where: { timestamp: { gte: since } }, select: { timestamp: true, eventType: true } }),
  ]);

  const viewsByDay = new Map<string, number>();
  const clicksByDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const key = daysAgo(i).toISOString().slice(0, 10);
    viewsByDay.set(key, 0);
    clicksByDay.set(key, 0);
  }
  for (const log of logs) {
    const key = log.timestamp.toISOString().slice(0, 10);
    const map = log.eventType === "click" ? clicksByDay : viewsByDay;
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }

  const rows: string[][] = [];
  rows.push(["Tendencia diaria"]);
  rows.push(["Fecha", "Visitas", "Clics"]);
  for (const [day, views] of viewsByDay) rows.push([day, String(views), String(clicksByDay.get(day) ?? 0)]);
  rows.push([]);

  rows.push(["Páginas más visitadas"]);
  rows.push(["Página", "Visitas"]);
  for (const r of byPath) rows.push([r.path, String(r._count.path)]);
  rows.push([]);

  rows.push(["Blogs más visitados"]);
  rows.push(["Blog", "Visitas"]);
  for (const r of byBlogPath) rows.push([r.path, String(r._count.path)]);
  rows.push([]);

  rows.push(["Clics más frecuentes"]);
  rows.push(["Etiqueta", "Clics"]);
  for (const r of byLabel) rows.push([r.label ?? "(sin etiqueta)", String(r._count.label)]);

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analitica.csv"`,
    },
  });
}
