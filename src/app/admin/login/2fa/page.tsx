import { TwoFactorForm } from "./TwoFactorForm";

export const metadata = { title: "Verificación en dos pasos — Agileology Wave" };
export const dynamic = "force-dynamic";

export default function TwoFactorLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Verificación en dos pasos</h1>
        <p className="mb-6 text-sm text-slate-500">
          Ingresa el código de tu app de autenticación.
        </p>
        <TwoFactorForm />
      </div>
    </div>
  );
}
