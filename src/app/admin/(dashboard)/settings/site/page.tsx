import { getSiteSettings } from "@/lib/settings";
import { SiteSettingsForm } from "./SiteSettingsForm";

export const metadata = { title: "Ajustes del sitio — Backoffice" };
export const dynamic = "force-dynamic";

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();
  // Read directly (not through a component prop from further up) so this
  // reflects exactly what the sitemap/robots routes themselves see at
  // request time -- if it's empty there, both quietly break (relative-only
  // sitemap URLs, no Sitemap: line in robots.txt), with nothing else in the
  // backoffice to surface that.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Ajustes del sitio</h1>
      <SiteSettingsForm settings={settings} siteUrl={siteUrl} />
    </div>
  );
}
