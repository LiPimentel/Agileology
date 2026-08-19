"use client";

import { useTransition } from "react";
import { restorePageVersion } from "../../actions";

export function VersionsList({ pageId, versions }: { pageId: string; versions: Array<{ id: string; createdAt: string }> }) {
  const [pending, startTransition] = useTransition();

  if (versions.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay versiones publicadas.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {versions.map((v, i) => (
        <li key={v.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <span>
            {new Date(v.createdAt).toLocaleString("es")} {i === 0 && <span className="ml-2 text-xs text-green-700">(actual)</span>}
          </span>
          {i !== 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("¿Restaurar esta versión? Se publicará de inmediato.")) {
                  startTransition(() => restorePageVersion(pageId, v.id));
                }
              }}
              className="text-violet-700 hover:underline"
            >
              Restaurar
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
