"use client";

import { useActionState } from "react";
import { submitCustomForm, type CustomFormState } from "@/lib/actions/customForm";

const initialState: CustomFormState = {};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600";

export type PublicFormField = {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder: string | null;
  options: string[];
};

/** Public render of a "customForm" block -- same honeypot/submit shape as ContactForm.tsx, but its fields are entirely admin-defined (see FormField). */
export function CustomFormRenderer({
  pageId,
  formId,
  fields,
  successMessage,
}: {
  pageId: string;
  formId: string;
  fields: PublicFormField[];
  successMessage: string;
}) {
  const [state, formAction, pending] = useActionState(submitCustomForm, initialState);

  if (state.success) {
    return <p className="rounded-md bg-green-50 p-4 text-green-800">{successMessage}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="formId" value={formId} />
      {/* Honeypot field, hidden from real visitors via CSS (7.8) */}
      <div className="hidden" aria-hidden>
        <label htmlFor="company">Empresa</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      {fields.map((field) => (
        <div key={field.id}>
          {field.fieldType === "checkbox" ? (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name={field.id} required={field.required} />
              {field.label}
              {field.required && " *"}
            </label>
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-700">
                {field.label}
                {field.required && " *"}
              </label>
              {field.fieldType === "textarea" ? (
                <textarea name={field.id} required={field.required} placeholder={field.placeholder ?? ""} rows={5} className={inputClass} />
              ) : field.fieldType === "select" ? (
                <select name={field.id} required={field.required} defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Selecciona una opción
                  </option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.fieldType === "email" ? "email" : field.fieldType === "tel" ? "tel" : "text"}
                  name={field.id}
                  required={field.required}
                  placeholder={field.placeholder ?? ""}
                  className={inputClass}
                />
              )}
            </>
          )}
        </div>
      ))}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
