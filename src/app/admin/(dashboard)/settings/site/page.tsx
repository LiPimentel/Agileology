import { getSiteSettings } from "@/lib/settings";
import { SiteSettingsForm } from "./SiteSettingsForm";

export const metadata = { title: "Ajustes del sitio — Backoffice" };
export const dynamic = "force-dynamic";

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Ajustes del sitio</h1>
      <SiteSettingsForm settings={settings} />
    </div>
  );
}
