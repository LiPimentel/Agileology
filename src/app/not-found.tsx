import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const settings = await getSiteSettings();

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#1c1140] px-6 text-center text-white">
      <p className="text-sm uppercase tracking-widest text-white/60">404</p>
      <h1 className="mt-2 text-3xl font-bold">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-white/70">
        El enlace que seguiste puede estar roto o la página fue movida. Vuelve al inicio de {settings.siteTitle}.
      </p>
      <Link href="/" className="mt-6 rounded-md bg-violet-600 px-5 py-2 font-medium hover:bg-violet-500">
        Ir al inicio
      </Link>
    </div>
  );
}
