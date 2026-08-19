import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Recuperar contraseña — Agileology Wave" };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Recuperar contraseña</h1>
        <p className="mb-6 text-sm text-slate-500">Te enviaremos un enlace a tu email registrado.</p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
