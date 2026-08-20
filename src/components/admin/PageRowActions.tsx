"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePage, duplicatePage } from "@/app/admin/(dashboard)/pages/actions";

export function PageRowActions({ pageId, isSystem }: { pageId: string; isSystem: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-3 text-sm">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => duplicatePage(pageId))}
        className="text-slate-600 hover:text-violet-700"
      >
        Duplicar
      </button>
      {!isSystem && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("¿Eliminar esta página? Esta acción no se puede deshacer.")) {
              startTransition(async () => {
                await deletePage(pageId);
                router.refresh();
              });
            }
          }}
          className="text-red-600 hover:underline"
        >
          Eliminar
        </button>
      )}
    </div>
  );
}
