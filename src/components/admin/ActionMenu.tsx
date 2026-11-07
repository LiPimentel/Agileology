"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ActionMenuItem = { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean };

/**
 * "⋯" menu that groups secondary actions. Keyboard: Enter/Space/↓/↑ on the button opens it,
 * ↑/↓/Home/End move between items, Esc closes and returns focus to the button, Tab closes.
 * Clicking outside closes it. `tone="onDark"` styles the button for dark toolbars.
 */
export function ActionMenu({
  items,
  label = "Acciones",
  tone = "light",
  id,
  disabled,
}: {
  items: ActionMenuItem[];
  label?: string;
  tone?: "light" | "onDark";
  id?: string;
  disabled?: boolean;
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusIndex = useRef(0);

  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }
  function openAt(first: boolean) {
    focusIndex.current = first ? enabled[0] ?? 0 : enabled[enabled.length - 1] ?? 0;
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    itemRefs.current[focusIndex.current]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const pos = enabled.indexOf(current);
    const focusAt = (n: number) => itemRefs.current[enabled[(n + enabled.length) % enabled.length]]?.focus();
    if (e.key === "ArrowDown") { e.preventDefault(); focusAt(pos + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusAt(pos - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusAt(0); }
    else if (e.key === "End") { e.preventDefault(); focusAt(enabled.length - 1); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === "Tab") close(false);
  }

  const trigger =
    tone === "onDark"
      ? "rounded px-2 py-1 text-base font-bold leading-none text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
      : "rounded-md px-2 py-1 text-lg font-bold leading-none text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-600 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <div ref={wrapRef} className="relative inline-block text-left">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openAt(true))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); openAt(true); }
          if (e.key === "ArrowUp") { e.preventDefault(); openAt(false); }
        }}
        className={`${trigger} disabled:opacity-40`}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-40 mt-1 min-w-[11rem] rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {items.map((it, i) => (
            <button
              key={it.label}
              ref={(el) => { itemRefs.current[i] = el; }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={it.disabled}
              onClick={() => { close(true); it.onSelect(); }}
              className={`block w-full px-4 py-2 text-left hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:opacity-40 dark:hover:bg-slate-700 dark:focus-visible:bg-slate-700 ${it.danger ? "text-red-700 dark:text-red-400" : "text-slate-800 dark:text-slate-100"}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
