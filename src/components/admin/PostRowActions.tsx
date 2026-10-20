"use client";

import { useTransition } from "react";
import { deletePost } from "@/app/admin/(dashboard)/posts/actions";

export function PostRowActions({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Eliminar este post? Esta acción no se puede deshacer.")) {
          startTransition(() => deletePost(postId));
        }
      }}
      className="text-sm text-red-600 hover:underline dark:text-red-400"
    >
      Eliminar
    </button>
  );
}
