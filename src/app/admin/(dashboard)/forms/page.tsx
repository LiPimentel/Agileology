import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FormRowActions } from "@/components/admin/FormRowActions";

export const metadata = { title: "Formularios — Backoffice" };
export const dynamic = "force-dynamic";

export default async function FormsListPage() {
  const forms = await prisma.formDefinition.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { fields: true, submissions: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Formularios</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Crea un formulario una vez y agrégalo como componente en cualquier página desde &quot;+ Agregar componente&quot;.
          </p>
        </div>
        <Link
          href="/admin/forms/new"
          className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          Nuevo formulario
        </Link>
      </div>

      {forms.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no has creado ningún formulario.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Campos</th>
                <th className="px-4 py-3">Envíos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">
                    <Link href={`/admin/forms/${f.id}`} className="font-medium text-violet-700 hover:underline dark:text-sky-400">
                      {f.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{f._count.fields}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/forms/${f.id}/submissions`} className="text-violet-700 hover:underline dark:text-sky-400">
                      {f._count.submissions}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <FormRowActions formId={f.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
