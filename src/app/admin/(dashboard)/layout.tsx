import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pages", label: "Páginas" },
  { href: "/admin/posts", label: "Blog" },
  { href: "/admin/media", label: "Medios" },
  { href: "/admin/inbox", label: "Bandeja de entrada" },
  { href: "/admin/analytics", label: "Analítica" },
  { href: "/admin/settings/site", label: "Ajustes del sitio" },
  { href: "/admin/settings/menu", label: "Menú del sitio" },
  { href: "/admin/settings/communications", label: "Comunicaciones" },
  { href: "/admin/settings/audit", label: "Auditoría" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [admin, settings] = await Promise.all([requireAdmin(), getSiteSettings()]);
  if (!admin.twoFactorEnabled) redirect("/admin/setup-2fa");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          {/* Real uploaded logo (Ajustes del sitio → Logo) when set. */}
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.siteTitle} className="h-8 w-auto" />
          ) : (
            <p className="font-semibold text-violet-800">{settings.siteTitle}</p>
          )}
          <p className="text-xs text-slate-500">Backoffice</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-3">
          <p className="mb-2 truncate text-xs text-slate-500">{admin.email}</p>
          <form action={logout}>
            <button type="submit" className="text-sm text-slate-600 underline hover:text-violet-800">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
