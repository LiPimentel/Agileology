import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/date";

export const metadata = { title: "Analítica — Backoffice" };
export const dynamic = "force-dynamic";

const RANGES: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Simple horizontal bar chart -- deliberately plain CSS (no charting library) to keep this dependency-free, same approach the trend chart already used. */
function BarList({ rows, max }: { rows: Array<{ label: string; count: number }>; max: number }) {
  if (rows.length === 0) return <p className="py-2 text-sm text-slate-500">Sin datos todavía.</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-slate-700" title={row.label}>
            {row.label}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-violet-600" style={{ width: `${max > 0 ? (row.count / max) * 100 : 0}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right font-medium text-slate-900">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

function DayTrend({ trend, colorClass }: { trend: Array<[string, number]>; colorClass: string }) {
  const max = Math.max(1, ...trend.map(([, c]) => c));
  return (
    <div className="flex h-32 items-end gap-1">
      {trend.map(([day, count]) => (
        <div key={day} className="flex flex-1 flex-col items-center gap-1" title={`${day}: ${count}`}>
          <div className={`w-full rounded-t ${colorClass}`} style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 4 : 0 }} />
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days = RANGES[range ?? "7d"] ?? 7;
  const since = daysAgo(days);
  const rangeQuery = range ? `?range=${range}` : "";

  const [totalViews, totalClicks, byPath, byBlogPath, byLabel, logs] = await Promise.all([
    prisma.visitLog.count({ where: { timestamp: { gte: since }, eventType: "pageview" } }),
    prisma.visitLog.count({ where: { timestamp: { gte: since }, eventType: "click" } }),
    prisma.visitLog.groupBy({
      by: ["path"],
      where: { timestamp: { gte: since }, eventType: "pageview" },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    // "blogs leídos o entrados" / "blogs más visitados" -- every blog post
    // view already lands in VisitLog with path="/blog/<slug>" (VisitTracker
    // fires on every public route, blog posts included), so this needs no
    // new tracking, just its own filtered breakdown.
    prisma.visitLog.groupBy({
      by: ["path"],
      where: { timestamp: { gte: since }, eventType: "pageview", path: { startsWith: "/blog/" } },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    // "click dentro del sitio" -- chat widget opened, WhatsApp/phone/social
    // links, CTA link blocks (see track-click.ts / TrackedLink.tsx).
    prisma.visitLog.groupBy({
      by: ["label"],
      where: { timestamp: { gte: since }, eventType: "click", label: { not: null } },
      _count: { label: true },
      orderBy: { _count: { label: "desc" } },
      take: 10,
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
  const viewsTrend = Array.from(viewsByDay.entries());
  const clicksTrend = Array.from(clicksByDay.entries());

  const pathRows = byPath.map((r) => ({ label: r.path, count: r._count.path }));
  const blogRows = byBlogPath.map((r) => ({ label: r.path, count: r._count.path }));
  const labelRows = byLabel.map((r) => ({ label: r.label ?? "(sin etiqueta)", count: r._count.label }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Analítica</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {Object.keys(RANGES).map((r) => (
            <a
              key={r}
              href={`/admin/analytics?range=${r}`}
              className={`rounded-md px-3 py-1.5 ${(range ?? "7d") === r ? "bg-violet-700 text-white" : "border border-slate-300 text-slate-700 hover:bg-white"}`}
            >
              {r === "7d" ? "7 días" : r === "30d" ? "30 días" : "90 días"}
            </a>
          ))}
          <a
            href={`/admin/analytics/export${rangeQuery}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ Descargar CSV
          </a>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Visitas al sitio</p>
          <p className="text-4xl font-semibold text-violet-800">{totalViews}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Clics dentro del sitio</p>
          <p className="text-4xl font-semibold text-violet-800">{totalClicks}</p>
          <p className="mt-1 text-xs text-slate-400">Chat, WhatsApp, teléfono, redes sociales, botones de enlace.</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Tendencia de visitas</h2>
          <DayTrend trend={viewsTrend} colorClass="bg-violet-600" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Tendencia de clics</h2>
          <DayTrend trend={clicksTrend} colorClass="bg-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Páginas más visitadas</h2>
          <BarList rows={pathRows} max={Math.max(1, ...pathRows.map((r) => r.count))} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Blogs más visitados</h2>
          <BarList rows={blogRows} max={Math.max(1, ...blogRows.map((r) => r.count))} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 sm:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Clics más frecuentes</h2>
          <BarList rows={labelRows} max={Math.max(1, ...labelRows.map((r) => r.count))} />
        </div>
      </div>
    </div>
  );
}
