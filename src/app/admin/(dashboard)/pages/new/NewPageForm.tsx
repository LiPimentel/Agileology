"use client";

import { useActionState } from "react";
import { createPage, type PageFormState } from "../actions";

const initialState: PageFormState = {};

export function NewPageForm() {
  const [state, formAction, pending] = useActionState(createPage, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Título de la página</label>
        <input
          name="title"
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500"
        />
      </div>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
      >
        {pending ? "Creando..." : "Crear página"}
      </button>
    </form>
  );
}
