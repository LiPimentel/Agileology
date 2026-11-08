"use client";

import { useId } from "react";

export type LatestPostsBlockValue = { count: number; autoplay: boolean; intervalSeconds: number; author: string };

export const EMPTY_LATEST_POSTS: LatestPostsBlockValue = { count: 6, autoplay: true, intervalSeconds: 6, author: "Lissette Pimentel Sosa" };

const field = "rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-300";

export function LatestPostsBlockEditor({ value, onChange }: { value: LatestPostsBlockValue; onChange: (v: LatestPostsBlockValue) => void }) {
  const uid = useId();
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Muestra tus entradas publicadas más recientes, de a 3 a la vez, y las va rotando. Se actualiza sola cuando publicas una entrada nueva; no hay nada que elegir a mano.
      </p>
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor={`${uid}-count`} className={label}>Entradas en la rotación</label>
          <select id={`${uid}-count`} value={value.count} onChange={(e) => onChange({ ...value, count: Number(e.target.value) })} className={`${field} mt-1`}>
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n === 6 ? "6 (máximo)" : n}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[14rem] flex-1">
          <label htmlFor={`${uid}-author`} className={label}>Nombre que aparece en las tarjetas</label>
          <input id={`${uid}-author`} value={value.author} maxLength={80} onChange={(e) => onChange({ ...value, author: e.target.value })} className={`${field} mt-1 w-full`} />
        </div>
        <label className="mt-7 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.autoplay} onChange={(e) => onChange({ ...value, autoplay: e.target.checked })} /> Rotar automáticamente
        </label>
        {value.autoplay && (
          <div>
            <label htmlFor={`${uid}-interval`} className={label}>Cada {value.intervalSeconds} s</label>
            <input id={`${uid}-interval`} type="range" min={3} max={15} step={1} value={value.intervalSeconds} onChange={(e) => onChange({ ...value, intervalSeconds: Number(e.target.value) })} className="mt-2 w-32" />
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        La rotación se detiene al pasar el ratón, al enfocar con el teclado, con el botón de pausa, y si el visitante pidió «reducir movimiento».
      </p>
    </div>
  );
}
