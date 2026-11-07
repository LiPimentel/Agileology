"use client";

import { useTransition } from "react";
import { deletePost } from "@/app/admin/(dashboard)/posts/actions";
import { ActionMenu } from "@/components/admin/ActionMenu";

export function PostRowActions({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <ActionMenu
      label="Acciones del post"
      disabled={pending}
      items={[
        {
          label: "Eliminar",
          danger: true,
          onSelect: () => {
            if (confirm("¿Eliminar este post? Esta acción no se puede deshacer.")) {
              startTransition(() => deletePost(postId));
            }
          },
        },
      ]}
    />
  );
}
