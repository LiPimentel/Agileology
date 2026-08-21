"use client";

import Link from "next/link";

export type CustomFormBlockValue = { formId: string };

/**
 * Picks a form built in the reusable library (/admin/forms) -- fields
 * themselves are edited THERE, not here, since the same form can be
 * dropped onto several pages ("queden listos como componentes
 * independientes"). This editor is just the picker + a shortcut to go
 * manage the form's actual fields.
 */
export function CustomFormBlockEditor({
  value,
  onChange,
  formDefinitions,
}: {
  value: CustomFormBlockValue;
  onChange: (value: CustomFormBlockValue) => void;
  formDefinitions: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Formulario</label>
        <select
          value={value.formId}
          onChange={(e) => onChange({ formId: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Selecciona un formulario</option>
          {formDefinitions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      {formDefinitions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todavía no has creado ningún formulario.{" "}
          <Link href="/admin/forms/new" target="_blank" className="text-violet-700 underline dark:text-sky-400">
            Crear uno
          </Link>
          .
        </p>
      ) : (
        value.formId && (
          <Link
            href={`/admin/forms/${value.formId}`}
            target="_blank"
            className="inline-block text-sm text-violet-700 underline dark:text-sky-400"
          >
            Editar los campos de este formulario
          </Link>
        )
      )}
    </div>
  );
}
