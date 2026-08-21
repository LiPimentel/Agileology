"use client";

import { useTransition } from "react";
import { deleteForm } from "@/app/admin/(dashboard)/forms/actions";

export function FormRowActions({ formId }: { formId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Eliminar este formulario? También se borrarán sus envíos recibidos. Esta acción no se puede deshacer.")) {
          startTransition(() => deleteForm(formId));
        }
      }}
      className="text-sm text-red-600 hover:underline dark:text-red-400"
    >
      Eliminar
    </button>
  );
}
