import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { AuthShell } from "@/components/admin/AuthShell";

export const metadata = { title: "Recuperar contraseña — Agileology Wave" };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-slate-100">Recuperar contraseña</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Te enviaremos un enlace a tu email registrado.</p>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
