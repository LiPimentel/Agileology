"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Compact "+ Agregar componente" dropdown, replacing a row of always-
 * expanded buttons ("los componentes deben salir como en lista no todos
 * desplegados porque toma mucho espacio de la pantalla"). Click to open a
 * list of options, click one to pick it; closes on an outside click.
 */
export function AddBlockMenu<T extends string>({
  options,
  onSelect,
  label = "+ Agregar componente",
}: {
  options: Array<{ type: T; label: string }>;
  onSelect: (type: T) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:border-sky-500 dark:hover:bg-slate-800"
      >
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M0 0L5 6L10 0" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-52 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {options.map((o) => (
            <button
              key={o.type}
              type="button"
              onClick={() => {
                onSelect(o.type);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
