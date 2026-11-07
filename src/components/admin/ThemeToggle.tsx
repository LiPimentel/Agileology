"use client";

import { useId, useSyncExternalStore } from "react";
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
  const id = useId();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Modo oscuro"
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={() => setDark(!isDark)}
      className="group relative inline-flex h-8 w-14 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:focus-visible:outline-sky-300"
    >
      {/*
        Agileology's own switch, drawn in the logo's palette (sky blue → violet, over navy/indigo):
        a pill track with the logo's wave line by day and a few stars by night, and a knob that
        slides across carrying a sun or a crescent moon. Motion is skipped for visitors who
        prefer reduced motion.
      */}
      <svg viewBox="0 0 56 32" width="56" height="32" aria-hidden="true" focusable="false" className="h-8 w-14 overflow-visible">
        <defs>
          <linearGradient id={`${id}-day`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#DCEBFA" />
            <stop offset="1" stopColor="#E3DFF7" />
          </linearGradient>
          <linearGradient id={`${id}-night`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1F2A44" />
            <stop offset="1" stopColor="#3A3F7A" />
          </linearGradient>
          <linearGradient id={`${id}-glyph`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#74B0E0" />
            <stop offset="1" stopColor="#8B83D1" />
          </linearGradient>
        </defs>

        {/* track: day and night layers cross-fade */}
        <rect x="0.5" y="0.5" width="55" height="31" rx="15.5" fill={`url(#${id}-day)`} stroke="#B7C4EA" className="transition-opacity duration-300 motion-reduce:transition-none" opacity={isDark ? 0 : 1} />
        <rect x="0.5" y="0.5" width="55" height="31" rx="15.5" fill={`url(#${id}-night)`} stroke="#5B63A8" className="transition-opacity duration-300 motion-reduce:transition-none" opacity={isDark ? 1 : 0} />

        {/* day: the logo's wave line */}
        <path d="M31 21c3-6 6-4 8-1.5s5 3 8-1.5" fill="none" stroke="#9FABDF" strokeWidth="2" strokeLinecap="round" className="transition-opacity duration-300 motion-reduce:transition-none" opacity={isDark ? 0 : 1} />
        {/* night: stars */}
        <g fill="#B9C3F0" className="transition-opacity duration-300 motion-reduce:transition-none" opacity={isDark ? 1 : 0}>
          <circle cx="12" cy="10" r="1.1" />
          <circle cx="19" cy="21.5" r="0.9" />
          <circle cx="23" cy="9" r="0.8" />
          <circle cx="9" cy="19" r="0.7" />
        </g>

        {/* knob */}
        <g className="transition-transform duration-300 ease-out motion-reduce:transition-none" style={{ transform: `translateX(${isDark ? 24 : 0}px)` }}>
          <circle cx="16" cy="16.8" r="12" fill="#1F2A44" opacity="0.18" />
          <circle cx="16" cy="16" r="12" fill={isDark ? "#101831" : "#FFFFFF"} stroke={isDark ? "#6D74C8" : "#C4CEF0"} className="transition-colors duration-300 motion-reduce:transition-none" />
          {/* sun */}
          <g className="transition-opacity duration-300 motion-reduce:transition-none" opacity={isDark ? 0 : 1}>
            <circle cx="16" cy="16" r="4.2" fill={`url(#${id}-glyph)`} />
            <g stroke="#8B83D1" strokeWidth="1.6" strokeLinecap="round">
              <path d="M16 8.2v1.8M16 22v1.8M8.2 16H10M22 16h1.8" />
              <path d="m10.5 10.5 1.3 1.3M20.2 20.2l1.3 1.3M10.5 21.5l1.3-1.3M20.2 11.8l1.3-1.3" />
            </g>
          </g>
          {/* crescent moon */}
          <g className="transition-opacity duration-300 motion-reduce:transition-none" opacity={isDark ? 1 : 0}>
            <path transform="translate(9.6 9.6) scale(0.53)" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={`url(#${id}-glyph)`} />
          </g>
        </g>
      </svg>
    </button>
  );
}
