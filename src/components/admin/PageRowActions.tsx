"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePage, duplicatePage } from "@/app/admin/(dashboard)/pages/actions";
import { ActionMenu } from "@/components/admin/ActionMenu";

export function PageRowActions({ pageId, isSystem }: { pageId: string; isSystem: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <ActionMenu
      label="Acciones de la página"
      disabled={pending}
      items={[
        { label: "Duplicar", onSelect: () => startTransition(() => duplicatePage(pageId)) },
        ...(isSystem
          ? []
          : [
              {
                label: "Eliminar",
                danger: true,
                onSelect: () => {
                  if (confirm("¿Eliminar esta página? Esta acción no se puede deshacer.")) {
                    startTransition(async () => {
                      await deletePage(pageId);
                      router.refresh();
                    });
                  }
                },
              },
            ]),
      ]}
    />
  );
}
