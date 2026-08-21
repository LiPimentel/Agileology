"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

// Module-level, not component state: the class lives on <html>, outside
// React entirely, so "did it change" has to be told to every mounted
// ThemeToggle (in principle there's only ever one, in the sidebar/auth
// shells, but this stays correct if that ever changes) via this tiny
// pub-sub instead of each instance's own effect.
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}
// The server has no `document` -- rendering as "light" here matches the
// unauthenticated default, and useSyncExternalStore reconciles the real
// class after hydration itself, without the hydration-mismatch warning (or
// the extra setState-in-effect render) a plain useState+useEffect would
// need to do the same sync.
function getServerSnapshot() {
  return false;
}

function setDark(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
  } catch {
    // Private browsing / storage blocked -- the toggle still works for
    // this page load, it just won't be remembered next time.
  }
  listeners.forEach((l) => l());
}

/**
 * Backoffice-only dark mode switch -- "agrega un modo oscuro... con texto
 * resaltado en lila y celeste, parecido a los logos". Toggles a `.dark`
 * class on <html> (Tailwind's class-based dark variant -- see the
 * @custom-variant in globals.css) and remembers the choice in
 * localStorage; the inline script in admin/layout.tsx applies that saved
 * choice before first paint on every reload, so there's no flash of the
 * wrong theme.
 *
 * ROLLOUT: this round covers the shared chrome (sidebar/topbar), every
 * login/2FA/setup screen, and the dashboard home page -- the screens
 * every session touches first. The rest of the backoffice (page/post
 * editors, media, inbox, analytics, settings) isn't bespoke dark-themed
 * yet; the safety net in globals.css keeps them readable (dark canvas,
 * normal-contrast text) rather than fully dark-styled card by card. A
 * follow-up round can extend the same `dark:` classes screen by screen.
 */
export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setDark(!isDark)}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-300"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
