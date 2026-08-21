import { TwoFactorForm } from "./TwoFactorForm";
import { AuthShell } from "@/components/admin/AuthShell";

export const metadata = { title: "Verificación en dos pasos — Agileology Wave" };
export const dynamic = "force-dynamic";

export default function TwoFactorLoginPage() {
  return (
    <AuthShell>
      <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-slate-100">Verificación en dos pasos</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Ingresa el código de tu app de autenticación.
      </p>
      <TwoFactorForm />
    </AuthShell>
  );
}
