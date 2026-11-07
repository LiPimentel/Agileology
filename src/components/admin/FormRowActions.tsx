"use client";

import { useTransition } from "react";
import { deleteForm } from "@/app/admin/(dashboard)/forms/actions";
import { ActionMenu } from "@/components/admin/ActionMenu";

export function FormRowActions({ formId }: { formId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <ActionMenu
      label="Acciones del formulario"
      disabled={pending}
      items={[
        {
          label: "Eliminar",
          danger: true,
          onSelect: () => {
            if (confirm("¿Eliminar este formulario? También se borrarán sus envíos recibidos. Esta acción no se puede deshacer.")) {
              startTransition(() => deleteForm(formId));
            }
          },
        },
      ]}
    />
  );
}
