"use client";

import { useActionState } from "react";
import { updateSiteSettings, type SiteSettingsState } from "./actions";
import type { SiteSettings } from "@/generated/prisma/client";

const initialState: SiteSettingsState = {};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500";

export function SiteSettingsForm({ settings, siteUrl }: { settings: SiteSettings; siteUrl: string }) {
  const [state, formAction, pending] = useActionState(updateSiteSettings, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del sitio</label>
        <input name="siteTitle" defaultValue={settings.siteTitle} required className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Eslogan</label>
        <input name="tagline" defaultValue={settings.tagline ?? ""} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Meta descripción por defecto (SEO)
        </label>
        <textarea name="defaultMetaDescription" defaultValue={settings.defaultMetaDescription ?? ""} rows={2} className={inputClass} />
      </div>

      {/*
        "el backoffice incluye las configuraciones necesarias para que la
        página aparezca en internet? ... no recuerdo haberlo visto en el
        backoffice" -- sitemap.xml/robots.txt exist and update themselves
        automatically (no setting needed), but there was genuinely nothing
        in the backoffice showing they exist or work. This section doesn't
        add new mechanics, it makes the ones that already run visible and
        checkable, plus adds the one piece that really was missing: a place
        for the Google Search Console verification code.
      */}
      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Visibilidad en buscadores (SEO)</h2>
        {siteUrl ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            URL pública configurada: <span className="font-mono text-slate-800 dark:text-slate-200">{siteUrl}</span>
          </p>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">
            ⚠️ No hay una URL pública configurada (variable de entorno <code className="font-mono">NEXT_PUBLIC_SITE_URL</code>{" "}
            en el servidor). Sin ella, el mapa del sitio y robots.txt no incluyen la dirección completa y Google no puede
            usarlos correctamente -- esto se corrige en la configuración del servidor/Docker, no aquí.
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="text-violet-700 underline dark:text-sky-400">
            Ver mapa del sitio (sitemap.xml)
          </a>
          <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-violet-700 underline dark:text-sky-400">
            Ver robots.txt
          </a>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ambos se generan solos a partir de las páginas y publicaciones que ya tienes publicadas -- no hay nada que
          configurar en ellos.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Verificación de Google Search Console</label>
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
            En Search Console, agrega el sitio como propiedad con el método &quot;etiqueta HTML&quot; y pega aquí solo el
            valor de <code className="font-mono">content=&quot;...&quot;</code> que te den (no la etiqueta completa).
          </p>
          <input
            name="googleSiteVerification"
            defaultValue={settings.googleSiteVerification ?? ""}
            placeholder="AbCdEf123..."
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Logo</label>
          {settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="Logo actual" className="mb-2 h-10" />
          )}
          <input type="file" name="logo" accept="image/*" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Favicon</label>
          {settings.faviconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.faviconUrl} alt="Favicon actual" className="mb-2 h-8 w-8" />
          )}
          <input type="file" name="favicon" accept="image/*" className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Texto del pie de página</label>
        <textarea name="footerText" defaultValue={settings.footerText ?? ""} rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono</label>
          <input name="phone" defaultValue={settings.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp</label>
          <input name="whatsapp" defaultValue={settings.whatsapp ?? ""} className={inputClass} />
        </div>
      </div>

      {/*
        Each network's URL + an optional custom icon upload. Without a
        custom icon, the footer already shows a built-in Facebook/X/
        LinkedIn/Instagram icon (see SocialIcons.tsx) -- this is only for a
        client who wants their own icon style/brand instead of the default.
      */}
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            { urlName: "facebookUrl", iconName: "facebookIcon", label: "Facebook", current: settings.facebookIconUrl },
            { urlName: "twitterUrl", iconName: "twitterIcon", label: "Twitter/X", current: settings.twitterIconUrl },
            { urlName: "linkedinUrl", iconName: "linkedinIcon", label: "LinkedIn", current: settings.linkedinIconUrl },
            { urlName: "instagramUrl", iconName: "instagramIcon", label: "Instagram", current: settings.instagramIconUrl },
          ] as const
        ).map((s) => (
          <div key={s.urlName} className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{s.label} URL</label>
              <input name={s.urlName} defaultValue={settings[s.urlName] ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Icono personalizado (opcional)</label>
              {s.current && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.current} alt="" className="mb-1 h-6 w-6 object-contain" />
              )}
              <input type="file" name={s.iconName} accept="image/*" className="w-full text-xs dark:text-slate-300" />
            </div>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" name="cookieNoticeEnabled" defaultChecked={settings.cookieNoticeEnabled} />
        Mostrar aviso de cookies
      </label>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700 dark:text-green-400">Guardado.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
