import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Restablecer contraseña — Agileology Wave" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Restablecer contraseña</h1>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
