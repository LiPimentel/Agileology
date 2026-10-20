"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Enforces "el modo oscuro es solo para el backoffice" at the DOM level,
 * not just by scoping which components use `dark:` classes. The toggle
 * (ThemeToggle.tsx) adds `.dark` to <html> so it survives client-side
 * navigation *within* the admin area (Next.js doesn't tear down <html>
 * between routes) -- but that same survival meant the class stuck around
 * after navigating OUT of /admin/* too, via any soft/client-side
 * transition (a <Link>, the browser back button), not just a hard reload.
 * A hard reload was the only case actually exercised before ("visited the
 * public site, no .dark class" -- true, but only because a fresh
 * navigation runs no leftover admin JS at all).
 *
 * This component exists only to be mounted exactly as long as the admin
 * layout tree is. Its cleanup -- guaranteed to run the moment this subtree
 * unmounts, which is precisely when navigating away from /admin/*, soft or
 * hard -- strips the class so the public site never inherits it. Its mount
 * side re-applies a saved choice too (not just relying on the inline
 * script in admin/layout.tsx), which turns out to matter even though the
 * script already ran: see the comment inside for why.
 */
export function DarkModeScope() {
  useEffect(() => {
    // Re-applies the saved choice on every real mount, not just relying on
    // the inline script's one-time application -- in dev mode, React
    // deliberately mounts every component, unmounts it, then mounts it
    // again once (Strict Mode's effect double-invoke, to surface exactly
    // this kind of bug). That spurious middle unmount ran this same
    // cleanup and stripped `.dark` right after the inline script added it,
    // and with nothing here to re-add it, the final real mount left dark
    // mode silently off. Making the mount side idempotent (safe to call
    // whether or not the class is already there) fixes that self-inflicted
    // flicker and costs nothing in production, where Strict Mode's
    // double-invoke doesn't happen.
    try {
      if (localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
        document.documentElement.classList.add("dark");
      }
    } catch {
      // Private browsing / storage blocked -- nothing to restore.
    }
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);
  return null;
}
