import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { getSiteSettings } from "@/lib/settings";
import { AuthShell } from "@/components/admin/AuthShell";

export const metadata = { title: "Backoffice login — Agileology Wave" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const settings = await getSiteSettings();
  return (
    <AuthShell>
      {/*
        Real uploaded logo (Ajustes del sitio → Logo) instead of plain
        text, when set -- "agrega mi logo... en el login and dentro de la
        plataforma".
      */}
      {settings.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={settings.logoUrl} alt={settings.siteTitle} className="mx-auto mb-4 h-28 w-auto max-w-full" />
      ) : (
        <>
          <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-slate-100">Backoffice</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{settings.siteTitle}</p>
        </>
      )}
      <LoginForm />
      <Link
        href="/admin/login/forgot-password"
        className="mt-4 block text-center text-sm text-violet-700 underline dark:text-sky-400"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </AuthShell>
  );
}
