import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/admin/ThemeToggle";

/**
 * Shared shell for every pre-dashboard admin screen (login, 2FA,
 * forgot-password) -- same centered card each already had, now with the
 * dark-mode toggle in the corner so it's reachable before logging in too
 * (the sidebar's copy, in (dashboard)/layout.tsx, only exists once you're
 * already past this screen -- and the choice made here still persists
 * into the dashboard via the shared localStorage key).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="relative w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute right-3 top-3">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
