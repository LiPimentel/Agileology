import { THEME_STORAGE_KEY } from "@/lib/theme";

// Shared by every /admin/* route -- login, 2FA, setup-2fa, and the
// authenticated dashboard alike -- so a saved "modo oscuro" choice
// (ThemeToggle.tsx) applies to the WHOLE backoffice, not just the screens
// behind login, and applies before first paint everywhere (no flash of the
// wrong theme on reload). This file has no visual opinion of its own --
// each route's own layout/page still owns its actual markup and styling.
const THEME_SCRIPT = `(function () {
  try {
    if (localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();`;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      {children}
    </>
  );
}
