"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export type FilterField =
  | { type: "search"; name: string; label: string; placeholder?: string }
  | { type: "select"; name: string; label: string; options: Array<{ value: string; label: string }> }
  | { type: "date"; name: string; label: string };

const input = "mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const TYPING_DELAY_MS = 300;

/**
 * The filters of a list. They apply by themselves: a list narrows as you type (after a short pause),
 * and a choice in a menu or a date applies at once. The filters live in the address, so a filtered
 * list can be bookmarked or shared; sorting is kept (hidden inputs) and pagination restarts at page 1
 * (page parameters are not part of this form). Without JavaScript it still works as a normal GET form
 * with a "Filtrar" button.
 */
export function ListFilterBar({
  fields,
  values,
  resetHref,
  hidden = {},
  children,
}: {
  fields: FilterField[];
  values: Record<string, string>;
  resetHref: string;
  hidden?: Record<string, string | undefined>;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);
  const active = fields.some((f) => Boolean(values[f.name]));

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function apply() {
    if (timer.current) clearTimeout(timer.current);
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    }
    const qs = params.toString();
    setApplied(true);
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }
  const applyAfterPause = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(apply, TYPING_DELAY_MS);
  };

  return (
    <form
      ref={formRef}
      method="get"
      role="search"
      aria-label="Filtros de la lista"
            onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {fields.map((f) => {
        const id = `filter-${f.name}`;
        return (
          <div key={f.name}>
            <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              {f.label}
            </label>
            {f.type === "select" ? (
              <select id={id} name={f.name} defaultValue={values[f.name] ?? ""} onChange={applyAfterPause} className={input}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={f.name}
                type={f.type === "date" ? "date" : "search"}
                defaultValue={values[f.name] ?? ""}
                placeholder={f.type === "search" ? f.placeholder : undefined}
                onChange={f.type === "search" ? applyAfterPause : apply}
                className={`${input} ${f.type === "search" ? "w-56" : ""}`}
              />
            )}
          </div>
        );
      })}
      {/* Kept for keyboards and for browsers without JavaScript; the filters already apply on their own. */}
      <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
        Aplicar
      </button>
      {/* Always mounted so screen readers announce its changes. */}
      <span role="status" className="pb-2 text-xs text-slate-600 dark:text-slate-400">{pending ? "Filtrando…" : applied ? <span className="sr-only">Lista actualizada.</span> : ""}</span>
      {active && (
        <Link href={resetHref} className="text-sm text-slate-600 underline hover:text-violet-700 dark:text-slate-400 dark:hover:text-sky-400">
          Limpiar filtros
        </Link>
      )}
      {children}
    </form>
  );
}
