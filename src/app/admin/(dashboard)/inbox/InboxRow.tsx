"use client";

import { useTransition } from "react";

export function InboxRow({
  status,
  onMarkRead,
  onDelete,
  children,
}: {
  status: "new" | "read";
  onMarkRead: () => Promise<void>;
  onDelete: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={`rounded-lg border p-4 ${status === "new" ? "border-violet-300 bg-violet-50/40" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 text-sm text-slate-700">{children}</div>
        <div className="flex shrink-0 gap-3 text-xs">
          {status === "new" && (
            <button disabled={pending} onClick={() => startTransition(onMarkRead)} className="text-violet-700 hover:underline">
              Marcar leído
            </button>
          )}
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("¿Eliminar este mensaje de forma permanente?")) startTransition(onDelete);
            }}
            className="text-red-600 hover:underline"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
