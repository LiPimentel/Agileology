"use client";

import { useActionState } from "react";
import { updateSiteSettings, type SiteSettingsState } from "./actions";
import type { SiteSettings } from "@/generated/prisma/client";

const initialState: SiteSettingsState = {};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600";

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction, pending] = useActionState(updateSiteSettings, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nombre del sitio</label>
        <input name="siteTitle" defaultValue={settings.siteTitle} required className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Eslogan</label>
        <input name="tagline" defaultValue={settings.tagline ?? ""} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Meta descripción por defecto (SEO)
        </label>
        <textarea name="defaultMetaDescription" defaultValue={settings.defaultMetaDescription ?? ""} rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Logo</label>
          {settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="Logo actual" className="mb-2 h-10" />
          )}
          <input type="file" name="logo" accept="image/*" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Favicon</label>
          {settings.faviconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.faviconUrl} alt="Favicon actual" className="mb-2 h-8 w-8" />
          )}
          <input type="file" name="favicon" accept="image/*" className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Texto del pie de página</label>
        <textarea name="footerText" defaultValue={settings.footerText ?? ""} rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Teléfono</label>
          <input name="phone" defaultValue={settings.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">WhatsApp</label>
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
          <div key={s.urlName} className="space-y-2 rounded-md border border-slate-200 p-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">{s.label} URL</label>
              <input name={s.urlName} defaultValue={settings[s.urlName] ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Icono personalizado (opcional)</label>
              {s.current && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.current} alt="" className="mb-1 h-6 w-6 object-contain" />
              )}
              <input type="file" name={s.iconName} accept="image/*" className="w-full text-xs" />
            </div>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="cookieNoticeEnabled" defaultChecked={settings.cookieNoticeEnabled} />
        Mostrar aviso de cookies
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Guardado.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
