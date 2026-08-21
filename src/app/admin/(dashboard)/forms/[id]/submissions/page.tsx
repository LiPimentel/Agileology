import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormSubmissionRow } from "./FormSubmissionRow";

export const metadata = { title: "Envíos del formulario — Backoffice" };
export const dynamic = "force-dynamic";

export default async function FormSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.formDefinition.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form) notFound();

  const submissions = await prisma.formSubmission.findMany({
    where: { formId: id },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Link href={`/admin/forms/${id}`} className="text-sm text-violet-700 hover:underline dark:text-sky-400">
          ← {form.name}
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Envíos</h1>

      {submissions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Sin envíos todavía.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <FormSubmissionRow
              key={s.id}
              submission={{ id: s.id, data: s.data as Record<string, unknown>, status: s.status, submittedAt: s.submittedAt.toISOString() }}
              fields={form.fields.map((f) => ({ id: f.id, label: f.label, fieldType: f.fieldType }))}
            />
          ))}
        </div>
      )}
      {/*
        Field labels shown here are the form's CURRENT fields -- if a field
        was renamed or removed after some of these came in, older
        submissions still keep their original raw data (keyed by field id,
        see FormSubmission.data), it just won't have a label to show under
        anymore.
      */}
      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
        Las etiquetas mostradas son las actuales del formulario -- si cambiaste o eliminaste un campo, los envíos
        anteriores conservan sus datos pero pueden no mostrar todo bajo su nombre original.
      </p>
    </div>
  );
}
