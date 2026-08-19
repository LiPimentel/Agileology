"use client";

import { useActionState } from "react";
import { updateBlogLayout, type BlogSettingsState } from "./actions";

const initialState: BlogSettingsState = {};

export function BlogLayoutForm({ layoutType }: { layoutType: "grid" | "list" }) {
  const [state, formAction, pending] = useActionState(updateBlogLayout, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="radio" name="layoutType" value="grid" defaultChecked={layoutType === "grid"} />
          Cuadrícula (tarjetas)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="radio" name="layoutType" value="list" defaultChecked={layoutType === "list"} />
          Lista
        </label>
      </div>
      {state.success && <p className="text-sm text-green-700">Guardado.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
