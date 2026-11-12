import { getSiteSettings } from "@/lib/settings";
import { DomainForm } from "./DomainForm";

export const metadata = { title: "Dominio y publicación — Backoffice" };
export const dynamic = "force-dynamic";

export default async function DomainSettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Dominio y publicación</h1>
      <p className="mb-6 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
        La dirección con la que el mundo conoce tu sitio. Aquí la defines y compruebas que todo está listo. Comprar, transferir o apuntar el dominio se hace en Cloudflare o en tu registrador, no desde aquí: abajo tienes la guía.
      </p>
      <DomainForm publicUrl={settings.publicUrl ?? ""} envUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""} canonicalHost={settings.canonicalHost} />
    </div>
  );
}
