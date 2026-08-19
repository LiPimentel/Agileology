import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireAdmin, generateTwoFactorSecret, buildOtpauthUrl, twoFactorQrDataUrl } from "@/lib/auth";
import { ConfirmForm } from "./ConfirmForm";

export const metadata = { title: "Activar verificación en dos pasos — Agileology Wave" };
export const dynamic = "force-dynamic";

export default async function SetupTwoFactorPage() {
  const admin = await requireAdmin();

  if (admin.twoFactorEnabled) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">La verificación en dos pasos ya está activa</h1>
        <a href="/admin" className="mt-4 inline-block text-violet-700 underline">
          Ir al backoffice
        </a>
      </div>
    );
  }

  let secret = admin.twoFactorSecret;
  if (!secret) {
    secret = generateTwoFactorSecret(admin.email).base32;
    await prisma.admin.update({ where: { id: admin.id }, data: { twoFactorSecret: secret } });
  }
  const otpauthUrl = buildOtpauthUrl(admin.email, secret);

  const qr = await twoFactorQrDataUrl(otpauthUrl);

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Activa la verificación en dos pasos</h1>
      <p className="mb-6 text-sm text-slate-600">
        Es obligatoria porque esta cuenta controla todo el contenido del sitio (RS-03). Escanea el
        código con Google Authenticator, Authy o similar, luego ingresa el código de 6 dígitos.
      </p>
      <div className="mb-6 flex justify-center rounded-md border border-slate-200 bg-white p-4">
        <Image src={qr} alt="Código QR de verificación en dos pasos" width={200} height={200} unoptimized />
      </div>
      <p className="mb-6 break-all rounded bg-slate-100 p-2 text-center font-mono text-xs text-slate-600">
        {secret}
      </p>
      <ConfirmForm />
    </div>
  );
}
