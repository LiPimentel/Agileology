import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Backoffice login — Agileology Wave" };
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Backoffice</h1>
        <p className="mb-6 text-sm text-slate-500">Agileology Wave</p>
        <LoginForm />
        <Link href="/admin/login/forgot-password" className="mt-4 block text-center text-sm text-violet-700 underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  );
}
