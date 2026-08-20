"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "@/lib/actions/contact";

const initialState: ContactFormState = {};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600";

export function ContactForm({ pageId, enabledFields }: { pageId: string; enabledFields: string[] }) {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  if (state.success) {
    return <p className="rounded-md bg-green-50 p-4 text-green-800">Gracias, tu mensaje fue enviado.</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="pageId" value={pageId} />
      {/* Honeypot field, hidden from real visitors via CSS (7.8) */}
      <div className="hidden" aria-hidden>
        <label htmlFor="company">Empresa</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      {enabledFields.includes("name") && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Nombre</label>
          <input name="name" required className={inputClass} />
        </div>
      )}
      {enabledFields.includes("email") && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input type="email" name="email" required className={inputClass} />
        </div>
      )}
      {enabledFields.includes("message") && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Mensaje</label>
          <textarea name="message" required rows={5} className={inputClass} />
        </div>
      )}
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
