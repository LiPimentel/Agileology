"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveForm, type FormFormState } from "../actions";
import { FIELD_TYPE_LABELS, type FormFieldType } from "@/lib/formFieldTypes";

const initialState: FormFormState = {};
const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500";

type FieldDraft = {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder: string;
  options: string[];
};

function generateId() {
  // Same reasoning as elsewhere in the admin: crypto.randomUUID() needs a
  // secure context (HTTPS/localhost) and throws over plain HTTP.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function FormEditorForm({
  form,
}: {
  form: { id: string; name: string; destinationEmail: string; successMessage: string; fields: FieldDraft[] };
}) {
  const [state, formAction, pending] = useActionState(saveForm, initialState);
  const [fields, setFields] = useState<FieldDraft[]>(form.fields);

  function addField() {
    setFields((prev) => [...prev, { id: generateId(), label: "", fieldType: "text", required: false, placeholder: "", options: [] }]);
  }
  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }
  function moveField(id: string, dir: -1 | 1) {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function update(id: string, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6 pb-16">
      <input type="hidden" name="formId" value={form.id} />
      <input type="hidden" name="fieldsJson" value={JSON.stringify(fields)} readOnly />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{form.name || "Formulario"}</h1>
        <Link href={`/admin/forms/${form.id}/submissions`} className="text-sm text-violet-700 hover:underline dark:text-sky-400">
          Ver envíos
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
          <input name="name" defaultValue={form.name} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email de destino (opcional)</label>
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
            Si lo dejas vacío, usa el correo general configurado en Comunicaciones.
          </p>
          <input name="destinationEmail" type="email" defaultValue={form.destinationEmail} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mensaje después de enviar</label>
          <input name="successMessage" defaultValue={form.successMessage} className={inputClass} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Campos</h2>
        <div className="space-y-3">
          {fields.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm italic text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Todavía no tiene campos -- agrega el primero abajo.
            </p>
          )}
          {fields.map((field, idx) => (
            <div key={field.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Campo {idx + 1}</span>
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveField(field.id, -1)}
                    className="text-slate-500 hover:text-violet-700 disabled:opacity-30 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={idx === fields.length - 1}
                    onClick={() => moveField(field.id, 1)}
                    className="text-slate-500 hover:text-violet-700 disabled:opacity-30 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => removeField(field.id)} className="text-red-600 hover:underline dark:text-red-400">
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Etiqueta</label>
                  <input
                    value={field.label}
                    onChange={(e) => update(field.id, { label: e.target.value })}
                    placeholder="Ej: Nombre completo"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Tipo</label>
                  <select
                    value={field.fieldType}
                    onChange={(e) => update(field.id, { fieldType: e.target.value })}
                    className={inputClass}
                  >
                    {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map((t) => (
                      <option key={t} value={t}>
                        {FIELD_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                {field.fieldType !== "checkbox" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Texto de ejemplo (opcional)</label>
                    <input
                      value={field.placeholder}
                      onChange={(e) => update(field.id, { placeholder: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                )}
                {field.fieldType === "select" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Opciones (separadas por coma)</label>
                    <input
                      value={field.options.join(", ")}
                      onChange={(e) => update(field.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                      placeholder="Opción 1, Opción 2, Opción 3"
                      className={inputClass}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={field.required} onChange={(e) => update(field.id, { required: e.target.checked })} />
                  Obligatorio
                </label>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addField}
          className="mt-3 rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:border-sky-500 dark:hover:bg-slate-800"
        >
          + Agregar campo
        </button>
      </section>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.savedAt && !state.error && <p className="text-sm text-green-700 dark:text-green-400">Guardado.</p>}

      <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-slate-50/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        <Link
          href="/admin/forms"
          className="rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Volver a Formularios
        </Link>
      </div>
    </form>
  );
}
