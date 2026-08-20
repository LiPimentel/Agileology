"use client";

import { useActionState } from "react";
import { createPage, type PageFormState } from "../actions";

const initialState: PageFormState = {};

export function NewPageForm() {
  const [state, formAction, pending] = useActionState(createPage, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Título de la página</label>
        <input
          name="title"
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Creando..." : "Crear página"}
      </button>
    </form>
  );
}
