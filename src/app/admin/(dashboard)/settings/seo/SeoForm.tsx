"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { SaveFeedback } from "@/components/admin/SaveFeedback";
import { isHomeSlug } from "@/lib/home";
import { fullTitle, resolveSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/lib/seo";
import { saveSeo, type SeoState } from "./actions";

type PageRow = { id: string; title: string; slug: string; status: "draft" | "published"; seoTitle: string | null; seoDescription: string | null };

const field = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function Counter({ id, length, max, what }: { id: string; length: number; max: number; what: string }) {
  const over = length > max;
  return (
    <p id={id} className={`mt-1 text-xs ${over ? "font-medium text-amber-800 dark:text-amber-300" : "text-slate-600 dark:text-slate-400"}`}>
      {length}/{max} caracteres{over ? ` — ${what} se cortará en los resultados de Google` : ""}
    </p>
  );
}

export function SeoForm({ pages, siteTitle, defaultDescription }: { pages: PageRow[]; siteTitle: string; defaultDescription: string }) {
  const [state, formAction, pending] = useActionState<SeoState, FormData>(saveSeo, {});
  const [values, setValues] = useState<Record<string, { t: string; d: string }>>(() =>
    Object.fromEntries(pages.map((p) => [p.id, { t: p.seoTitle ?? "", d: p.seoDescription ?? "" }])),
  );
  const [defDesc, setDefDesc] = useState(defaultDescription);
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const set = (id: string, patch: Partial<{ t: string; d: string }>) => setValues((v) => ({ ...v, [id]: { ...v[id], ...patch } }));
  const shown = useMemo(
    () =>
      pages.filter((p) => {
        const q = query.trim().toLowerCase();
        if (q && !p.title.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false;
        if (onlyMissing && values[p.id].d.trim()) return false;
        return true;
      }),
    [pages, query, onlyMissing, values],
  );
  const liveWithoutOwnDescription = pages.filter((p) => p.status === "published" && !values[p.id].d.trim()).length;

  return (
    <form action={formAction} className="space-y-6">
      <SaveFeedback state={state} successMessage="SEO guardado." />
      {pages.map((p) => (
        <input key={p.id} type="hidden" name="pageId" value={p.id} />
      ))}

      <section aria-labelledby="seo-default" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="seo-default" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Descripción por defecto del sitio</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Se usa en todas las páginas que no tengan su propia descripción. Es la red de seguridad: con una buena aquí, ninguna página queda sin texto en Google.
        </p>
        <label htmlFor="defaultMetaDescription" className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
        <textarea
          id="defaultMetaDescription"
          name="defaultMetaDescription"
          rows={2}
          maxLength={300}
          value={defDesc}
          onChange={(e) => setDefDesc(e.target.value)}
          aria-describedby="count-default"
          className={field}
        />
        <Counter id="count-default" length={defDesc.length} max={SEO_DESCRIPTION_MAX} what="la descripción" />
      </section>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="seo-search" className="block text-xs font-medium text-slate-600 dark:text-slate-400">Buscar página</label>
          <input id="seo-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título o dirección..." className="mt-1 w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Solo las que no tienen descripción propia
        </label>
        <p role="status" className="pb-2 text-sm text-slate-600 dark:text-slate-400">
          {liveWithoutOwnDescription === 0 ? "Todas las páginas publicadas tienen descripción propia." : `${liveWithoutOwnDescription} página${liveWithoutOwnDescription === 1 ? "" : "s"} publicada${liveWithoutOwnDescription === 1 ? "" : "s"} usa${liveWithoutOwnDescription === 1 ? "" : "n"} la descripción por defecto.`}
        </p>
      </div>

      <ul className="space-y-4">
        {shown.length === 0 && <li className="text-sm text-slate-600 dark:text-slate-400">Ninguna página coincide.</li>}
        {shown.map((p) => {
          const v = values[p.id];
          const seo = resolveSeo({ pageTitle: p.title, seoTitle: v.t, seoDescription: v.d, siteTitle, defaultDescription: defDesc, isHome: isHomeSlug(p.slug) });
          const shownTitle = fullTitle(seo.title, siteTitle, isHomeSlug(p.slug)).text;
          const tId = `t-${p.id}`;
          const dId = `d-${p.id}`;
          return (
            <li key={p.id} className="scroll-mb-24 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  <Link href={`/admin/pages/${p.id}`} className="text-violet-700 hover:underline dark:text-sky-400">{p.title}</Link>
                  <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">/{isHomeSlug(p.slug) ? "" : p.slug}</span>
                </h2>
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "published" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                  {p.status === "published" ? "Publicada" : "Borrador (no se ve en Google)"}
                </span>
              </div>

              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <label htmlFor={tId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Título SEO</label>
                  <input id={tId} name={`seoTitle:${p.id}`} value={v.t} maxLength={120} onChange={(e) => set(p.id, { t: e.target.value })} placeholder={seo.titleSource === "own" ? "" : `Por defecto: ${seo.title}`} aria-describedby={`${tId}-count`} className={field} />
                  <Counter id={`${tId}-count`} length={v.t.length} max={SEO_TITLE_MAX} what="el título" />
                </div>
                <div>
                  <label htmlFor={dId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                  <textarea id={dId} name={`seoDescription:${p.id}`} rows={2} value={v.d} maxLength={300} onChange={(e) => set(p.id, { d: e.target.value })} placeholder={defDesc ? "Por defecto: la descripción del sitio" : "Sin descripción: Google elegirá un fragmento al azar"} aria-describedby={`${dId}-count`} className={field} />
                  <Counter id={`${dId}-count`} length={v.d.length} max={SEO_DESCRIPTION_MAX} what="la descripción" />
                </div>
              </div>

              <div className="mt-3 rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Así se verá en Google</p>
                <p className="mt-1 truncate text-base text-[#1a0dab] dark:text-sky-300">{shownTitle}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {seo.description ?? <span className="text-amber-800 dark:text-amber-300">Sin descripción: escribe una, o una por defecto arriba.</span>}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {seo.titleSource === "own" ? "Título propio" : seo.titleSource === "page" ? "Título tomado del nombre de la página" : "Título tomado del nombre del sitio"}
                  {" · "}
                  {seo.descriptionSource === "own" ? "descripción propia" : seo.descriptionSource === "default" ? "descripción por defecto" : "sin descripción"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 -mx-2 flex items-center gap-3 border-t border-slate-200 bg-slate-50/95 px-2 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <button type="submit" disabled={pending} className="rounded-md bg-violet-700 px-5 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500">
          {pending ? "Guardando…" : "Guardar SEO"}
        </button>
        <p className="text-xs text-slate-600 dark:text-slate-400">Guarda todas las páginas de la lista a la vez. Los cambios se ven en el sitio al momento.</p>
      </div>
    </form>
  );
}
