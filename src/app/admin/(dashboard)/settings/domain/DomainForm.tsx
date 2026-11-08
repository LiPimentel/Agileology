"use client";

import { useActionState } from "react";
import { SaveFeedback } from "@/components/admin/SaveFeedback";
import { AlertTriangleIcon, CheckCircleIcon } from "@/components/icons";
import type { Check, CheckStatus } from "@/lib/domainCheck";
import { saveDomain, verifyDomain, type DomainState, type VerifyState } from "./actions";

const field = "mt-1 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const STATUS: Record<CheckStatus, { label: string; cls: string }> = {
  ok: { label: "Bien", cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  warn: { label: "Revisar", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300" },
  fail: { label: "Falta", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  info: { label: "Info", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

function CheckRow({ c }: { c: Check }) {
  const s = STATUS[c.status];
  return (
    <li className="flex gap-3 border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800">
      <span className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
        {c.status === "ok" && <CheckCircleIcon size={12} className="mr-1 inline align-text-bottom" />}
        {(c.status === "warn" || c.status === "fail") && <AlertTriangleIcon size={12} className="mr-1 inline align-text-bottom" />}
        {s.label}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{c.detail}</p>
      </div>
    </li>
  );
}

const STEPS = [
  "Crea una cuenta gratis en Cloudflare (con verificación en dos pasos) y añade tu dominio.",
  "Cambia los servidores de nombres del dominio, en el registrador actual, por los dos de Cloudflare. Tu sitio actual sigue funcionando.",
  "Crea el túnel de Cloudflare hacia http://localhost:3000 y la regla de Cloudflare Access para /admin*.",
  "En el archivo .env: borra APP_BIND, y pon TRUSTED_IP_HEADER=cf-connecting-ip y COOKIE_SECURE=true. Reconstruye la imagen.",
  "Guarda aquí arriba la dirección https://tudominio.com, elige con o sin www, y pulsa «Verificar ahora».",
  "Cuando todo esté en «Bien», apunta el dominio al túnel. Después transfiere el registro del dominio y, al final, cancela el plan anterior.",
];

export function DomainForm({ publicUrl, envUrl, canonicalHost }: { publicUrl: string; envUrl: string; canonicalHost: string }) {
  const [state, formAction, pending] = useActionState<DomainState, FormData>(saveDomain, {});
  const [verify, verifyAction, verifying] = useActionState<VerifyState>(verifyDomain, {});

  return (
    <div className="space-y-8">
      <form action={formAction} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <SaveFeedback state={state} successMessage="Dirección guardada." />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Dirección del sitio</h2>

        <label htmlFor="publicUrl" className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">Dirección pública</label>
        <input id="publicUrl" name="publicUrl" defaultValue={publicUrl} placeholder="https://agileologywave.com" aria-describedby="publicUrl-help" className={field} />
        <p id="publicUrl-help" className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Solo el dominio, sin ruta. La usan el mapa del sitio, el RSS, los enlaces de los correos y las vistas previas al compartir.
          {envUrl && !publicUrl ? ` Mientras esté vacía se usa la del archivo de configuración: ${envUrl}.` : ""}
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Con o sin «www»?</legend>
          <p className="text-xs text-slate-600 dark:text-slate-400">Elige una sola forma: la otra redirige a ella (301) y Google ve un único sitio.</p>
          <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {[
              ["none", "Sin preferencia (no redirigir)"],
              ["apex", "Sin www: agileologywave.com"],
              ["www", "Con www: www.agileologywave.com"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input type="radio" name="canonicalHost" value={value} defaultChecked={canonicalHost === value} /> {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={pending} className="mt-4 rounded-md bg-violet-700 px-5 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500">
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </form>

      <section aria-labelledby="verify-h" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="verify-h" className="text-lg font-semibold text-slate-900 dark:text-slate-100">¿Está todo listo?</h2>
          <form action={verifyAction}>
            <button type="submit" disabled={verifying} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              {verifying ? "Verificando…" : "Verificar ahora"}
            </button>
          </form>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Comprueba en vivo el dominio, la conexión y la seguridad. Guarda la dirección antes de verificar.</p>
        <div role="status" aria-live="polite">
          {verify.checks ? (
            <>
              <ul className="mt-3">{verify.checks.map((c) => <CheckRow key={c.id} c={c} />)}</ul>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Verificado el {new Date(verify.at ?? 0).toLocaleString("es", { timeZone: "America/Santo_Domingo" })}.</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Pulsa «Verificar ahora» para ver el estado.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="guide-h" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="guide-h" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Guía para publicar en tu dominio</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          {STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Detalle completo, con la lista de seguridad, en <code>docs/hardening.md</code>.</p>
      </section>
    </div>
  );
}
