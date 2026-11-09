"use client";

import { useId } from "react";

export type QuoteValue = { text: string; author: string };
export type QuotesBlockValue = { title: string; quotes: QuoteValue[]; autoplay: boolean; intervalSeconds: number };

export const EMPTY_QUOTES: QuotesBlockValue = { title: "", quotes: [], autoplay: true, intervalSeconds: 7 };
const MAX = 40;

const field = "rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-300";
const small = "rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

export function QuotesBlockEditor({ value, onChange }: { value: QuotesBlockValue; onChange: (v: QuotesBlockValue) => void }) {
  const uid = useId();
  const quotes = value.quotes ?? [];
  const set = (next: QuoteValue[]) => onChange({ ...value, quotes: next });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= quotes.length) return;
    const next = [...quotes];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Un conjunto de frases: se ven 3 a la vez (menos en pantallas pequeñas) y van rotando con un deslizamiento suave. Escribe cada frase y su autor (deja el autor vacío si es anónima).
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor={`${uid}-title`} className={label}>Título (opcional)</label>
          <input id={`${uid}-title`} value={value.title} maxLength={80} onChange={(e) => onChange({ ...value, title: e.target.value })} className={`${field} mt-1 w-full`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.autoplay} onChange={(e) => onChange({ ...value, autoplay: e.target.checked })} /> Rotar automáticamente
        </label>
        {value.autoplay && (
          <div>
            <label htmlFor={`${uid}-interval`} className={label}>Cada {value.intervalSeconds} s</label>
            <input id={`${uid}-interval`} type="range" min={3} max={15} step={1} value={value.intervalSeconds} onChange={(e) => onChange({ ...value, intervalSeconds: Number(e.target.value) })} className="mt-2 w-32" />
          </div>
        )}
      </div>
      <ol className="space-y-3">
        {quotes.map((q, i) => (
          <li key={i} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
            <label htmlFor={`${uid}-t${i}`} className={label}>Frase {i + 1}</label>
            <textarea id={`${uid}-t${i}`} value={q.text} maxLength={300} rows={2} onChange={(e) => set(quotes.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} className={`${field} mt-1 w-full`} />
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1">
                <label htmlFor={`${uid}-a${i}`} className={label}>Autor</label>
                <input id={`${uid}-a${i}`} value={q.author} maxLength={80} onChange={(e) => set(quotes.map((x, k) => (k === i ? { ...x, author: e.target.value } : x)))} className={`${field} mt-1 w-full`} />
              </div>
              <button type="button" className={small} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir la frase ${i + 1}`}>↑</button>
              <button type="button" className={small} disabled={i === quotes.length - 1} onClick={() => move(i, 1)} aria-label={`Bajar la frase ${i + 1}`}>↓</button>
              <button type="button" className={small} onClick={() => set(quotes.filter((_, k) => k !== i))} aria-label={`Quitar la frase ${i + 1}`}>Quitar</button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" disabled={quotes.length >= MAX} onClick={() => set([...quotes, { text: "", author: "" }])} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
        Añadir frase ({quotes.length}/{MAX})
      </button>
    </div>
  );
}
