import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ListFilterBar, type FilterField } from "@/components/admin/list/ListFilterBar";
import { Pagination } from "@/components/admin/list/Pagination";
import { ACTION_LABELS, ENTITY_LABELS, parseAuditDetail } from "@/lib/auditDetail";
import { formatAstDateTime } from "@/lib/date";
import { PAGE_SIZE, dayRange, pageNumber, pick, type SearchParams } from "@/lib/listFilters";

export const metadata = { title: "Auditoría — Backoffice" };
export const dynamic = "force-dynamic";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const admin = pick(sp.admin);
  const action = pick(sp.action);
  const entity = pick(sp.entity);
  const q = pick(sp.q);
  const from = pick(sp.from);
  const to = pick(sp.to);
  const page = pageNumber(sp.page);

  const range = dayRange(from, to);
  const where = {
    ...(admin ? { adminId: admin } : {}),
    ...(action ? { action } : {}),
    ...(entity ? { entityType: entity } : {}),
    ...(range ? { timestamp: range } : {}),
    ...(q ? { OR: [{ detail: { contains: q, mode: "insensitive" as const } }, { entityId: { contains: q } }] } : {}),
  };

  const [logs, total, admins, actions, entities] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { admin: { select: { email: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.admin.findMany({ select: { id: true, email: true, name: true }, orderBy: { email: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ]);

  // Link to the page/post/form only if it still exists (a deleted one has nothing to open).
  const idsOf = (type: string) => logs.filter((l) => l.entityType === type && l.entityId).map((l) => l.entityId as string);
  const [pages, posts, forms] = await Promise.all([
    prisma.page.findMany({ where: { id: { in: idsOf("Page") } }, select: { id: true } }),
    prisma.post.findMany({ where: { id: { in: idsOf("Post") } }, select: { id: true } }),
    prisma.formDefinition.findMany({ where: { id: { in: idsOf("FormDefinition") } }, select: { id: true } }),
  ]);
  const exists = new Set([...pages, ...posts, ...forms].map((r) => r.id));
  const hrefFor = (type: string, id: string | null) =>
    !id || !exists.has(id) ? null : type === "Page" ? `/admin/pages/${id}` : type === "Post" ? `/admin/posts/${id}` : type === "FormDefinition" ? `/admin/forms/${id}` : null;

  const params = { admin, action, entity, q, from, to };
  const fields: FilterField[] = [
    { type: "search", name: "q", label: "Buscar en los detalles", placeholder: "Título, campo, valor..." },
    { type: "select", name: "admin", label: "Quién", options: [{ value: "", label: "Todos" }, ...admins.map((a) => ({ value: a.id, label: a.name ? `${a.name} (${a.email})` : a.email }))] },
    { type: "select", name: "action", label: "Acción", options: [{ value: "", label: "Todas" }, ...actions.map((a) => ({ value: a.action, label: ACTION_LABELS[a.action] ?? a.action }))] },
    { type: "select", name: "entity", label: "Elemento", options: [{ value: "", label: "Todos" }, ...entities.map((e) => ({ value: e.entityType, label: ENTITY_LABELS[e.entityType] ?? e.entityType }))] },
    { type: "date", name: "from", label: "Desde" },
    { type: "date", name: "to", label: "Hasta" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Registro de auditoría</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Quién hizo cada cambio en el backoffice, cuándo, y qué cambió (antes → después). Los registros anteriores a esta versión solo tienen la acción.
      </p>

      <ListFilterBar fields={fields} values={params} resetHref="/admin/settings/audit" />

      {logs.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Ningún registro coincide con los filtros.
        </p>
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => {
            const d = parseAuditDetail(log.detail);
            const changes = d.changes ?? [];
            const href = hrefFor(log.entityType, log.entityId);
            const who = log.admin ? (log.admin.name ? `${log.admin.name} (${log.admin.email})` : log.admin.email) : "—";
            const what = d.entity ?? `${ENTITY_LABELS[log.entityType] ?? log.entityType}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}`;
            return (
              <li key={log.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {ACTION_LABELS[log.action] ?? log.action}
                    <span className="font-normal text-slate-600 dark:text-slate-400"> · </span>
                    {href ? (
                      <Link href={href} className="text-violet-700 hover:underline dark:text-sky-400">
                        {what}
                      </Link>
                    ) : (
                      <span>{what}</span>
                    )}
                  </p>
                  <time dateTime={log.timestamp.toISOString()} className="text-sm text-slate-600 dark:text-slate-400">
                    {formatAstDateTime(log.timestamp)}
                  </time>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Por {who}</p>
                {(d.summary || d.text) && <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{d.summary ?? d.text}</p>}
                {changes.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-violet-700 hover:underline dark:text-sky-400">
                      Ver {changes.length} cambio{changes.length > 1 ? "s" : ""}
                    </summary>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <caption className="sr-only">Cambios realizados</caption>
                        <thead className="text-slate-600 dark:text-slate-400">
                          <tr>
                            <th scope="col" className="py-1 pr-4 font-medium">Qué</th>
                            <th scope="col" className="py-1 pr-4 font-medium">Antes</th>
                            <th scope="col" className="py-1 font-medium">Después</th>
                          </tr>
                        </thead>
                        <tbody>
                          {changes.map((c, i) => (
                            <tr key={i} className="border-t border-slate-100 align-top dark:border-slate-800">
                              <th scope="row" className="py-1.5 pr-4 font-medium text-slate-800 dark:text-slate-200">{c.field}</th>
                              <td className="break-words py-1.5 pr-4 text-red-800 dark:text-red-300">{c.from || "—"}</td>
                              <td className="break-words py-1.5 text-green-800 dark:text-green-300">{c.to || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <Pagination basePath="/admin/settings/audit" params={params} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
