import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { logout } from "../actions";
import { ThemeToggle } from "@/components/admin/ThemeToggle";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pages", label: "Páginas" },
  { href: "/admin/posts", label: "Blog" },
  { href: "/admin/media", label: "Medios" },
  { href: "/admin/forms", label: "Formularios" },
  { href: "/admin/inbox", label: "Bandeja de entrada" },
  { href: "/admin/analytics", label: "Analítica" },
];

// Everything under /admin/settings, grouped so it is easy to find.
const SETTINGS_NAV = [
  { href: "/admin/settings/site", label: "Ajustes del sitio" },
  { href: "/admin/settings/menu", label: "Menú del sitio" },
  { href: "/admin/settings/seo", label: "SEO de las páginas" },
  { href: "/admin/settings/domain", label: "Dominio y publicación" },
  { href: "/admin/settings/blog", label: "Diseño del blog" },
  { href: "/admin/settings/communications", label: "Comunicaciones" },
  { href: "/admin/settings/audit", label: "Auditoría" },
];

const LINK =
  "rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-300";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [admin, settings] = await Promise.all([requireAdmin(), getSiteSettings()]);
  if (!admin.twoFactorEnabled) redirect("/admin/setup-2fa");

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col self-start overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-5 dark:border-slate-800">
          <div className="min-w-0">
            {/* Real uploaded logo (Ajustes del sitio → Logo) when set. */}
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.siteTitle} className="h-auto max-h-16 w-auto max-w-full object-contain" />
            ) : (
              <p className="font-semibold text-violet-800 dark:text-sky-300">{settings.siteTitle}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">Backoffice</p>
          </div>
          <ThemeToggle />
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={LINK}>
              {item.label}
            </Link>
          ))}
        </nav>
        <nav aria-labelledby="settings-heading" className="flex flex-col gap-1 border-t border-slate-200 p-3 dark:border-slate-800">
          <p id="settings-heading" className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Configuración
          </p>
          {SETTINGS_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={LINK}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 truncate text-xs text-slate-500 dark:text-slate-400">{admin.email}</p>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-slate-600 underline hover:text-violet-800 dark:text-slate-400 dark:hover:text-sky-300"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 dark:text-slate-100">{children}</main>
    </div>
  );
}
