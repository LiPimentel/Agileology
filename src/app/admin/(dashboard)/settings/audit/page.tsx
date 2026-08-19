import { prisma } from "@/lib/prisma";

export const metadata = { title: "Auditoría — Backoffice" };
export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 200,
    include: { admin: { select: { email: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Registro de auditoría</h1>
      <p className="mb-6 text-sm text-slate-500">Últimas 200 acciones del backoffice (RS-10).</p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Entidad</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-500">{log.timestamp.toLocaleString("es")}</td>
                <td className="px-4 py-3">{log.admin?.email ?? "—"}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3 text-slate-500">
                  {log.entityType}
                  {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
