import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/date";

export const metadata = { title: "Analítica — Backoffice" };
export const dynamic = "force-dynamic";

const RANGES: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days = RANGES[range ?? "7d"] ?? 7;
  const since = daysAgo(days);

  const [total, byPath, logs] = await Promise.all([
    prisma.visitLog.count({ where: { timestamp: { gte: since } } }),
    prisma.visitLog.groupBy({
      by: ["path"],
      where: { timestamp: { gte: since } },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.visitLog.findMany({ where: { timestamp: { gte: since } }, select: { timestamp: true } }),
  ]);

  const dayCounts = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    dayCounts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const log of logs) {
    const key = log.timestamp.toISOString().slice(0, 10);
    if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const trend = Array.from(dayCounts.entries());
  const max = Math.max(1, ...trend.map(([, c]) => c));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Analítica de visitas</h1>
        <div className="flex gap-2 text-sm">
          {Object.keys(RANGES).map((r) => (
            <a
              key={r}
              href={`/admin/analytics?range=${r}`}
              className={`rounded-md px-3 py-1.5 ${(range ?? "7d") === r ? "bg-violet-700 text-white" : "border border-slate-300 text-slate-700 hover:bg-white"}`}
            >
              {r === "7d" ? "7 días" : r === "30d" ? "30 días" : "90 días"}
            </a>
          ))}
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Visitas totales</p>
        <p className="text-4xl font-semibold text-violet-800">{total}</p>
      </div>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Tendencia</h2>
        <div className="flex h-40 items-end gap-1">
          {trend.map(([day, count]) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-1" title={`${day}: ${count}`}>
              <div className="w-full rounded-t bg-violet-600" style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 4 : 0 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Páginas más visitadas</h2>
        <table className="w-full text-left text-sm">
          <tbody>
            {byPath.map((row) => (
              <tr key={row.path} className="border-t border-slate-100">
                <td className="py-2 text-slate-700">{row.path}</td>
                <td className="py-2 text-right font-medium text-slate-900">{row._count.path}</td>
              </tr>
            ))}
            {byPath.length === 0 && (
              <tr>
                <td className="py-2 text-slate-500">Sin datos todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
