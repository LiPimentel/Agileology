"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { savePage, type PageFormState } from "../actions";
import { BackgroundPicker } from "@/components/admin/BackgroundPicker";
import { SectionBlockEditor, type EditorSection } from "@/components/admin/SectionBlockEditor";
import type { MediaItem } from "@/components/admin/MediaGrid";

const initialState: PageFormState = {};
const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500";

export type PageEditorData = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  seoTitle: string | null;
  seoDescription: string | null;
  menuOrder: number;
  showInMenu: boolean;
  menuVisible: boolean;
  isSystem: boolean;
  background: {
    imageUrl: string | null;
    overlayColor: string;
    overlayOpacity: number;
    bannerImageUrl: string | null;
    showBanner: boolean;
    showTitle: boolean;
  } | null;
  sections: EditorSection[];
};

export function PageEditorForm({
  page,
  mediaLibrary,
  pages,
  formDefinitions,
}: {
  page: PageEditorData;
  mediaLibrary: MediaItem[];
  pages: Array<{ id: string; slug: string; title: string }>;
  formDefinitions: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(savePage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const draftButtonRef = useRef<HTMLButtonElement>(null);
  const [showBanner, setShowBanner] = useState(page.background?.showBanner ?? true);
  const [showTitle, setShowTitle] = useState(page.background?.showTitle ?? true);

  // Autosave draft periodically (7.14) so unsaved edits survive an accidental tab close.
  useEffect(() => {
    const id = setInterval(() => {
      if (!pending) draftButtonRef.current?.click();
    }, 30_000);
    return () => clearInterval(id);
  }, [pending]);

  return (
    <form ref={formRef} action={formAction} className="space-y-8 pb-16">
      <input type="hidden" name="pageId" value={page.id} />

      {/*
        "arriba puedes ver una parte que dice página: Inicio ahí puedo ir
        cambiando las páginas" -- jump straight to editing another page
        without leaving the editor for the pages list first. Not a form
        field (name-less <select>): purely a navigation shortcut, so it
        can't accidentally get submitted as part of savePage.
      */}
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        Página:
        <select
          value={page.id}
          onChange={(e) => router.push(`/admin/pages/${e.target.value}`)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{page.title || "Nueva página"}</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${page.status === "published" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}
        >
          {page.status === "published" ? "Publicada" : "Borrador"}
        </span>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Título</label>
          <input name="title" defaultValue={page.title} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Slug (URL)</label>
          <input name="slug" defaultValue={page.slug} disabled={page.isSystem} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Título SEO</label>
          <input name="seoTitle" defaultValue={page.seoTitle ?? ""} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Meta descripción SEO</label>
          <textarea name="seoDescription" defaultValue={page.seoDescription ?? ""} rows={2} className={inputClass} />
        </div>
      </section>
      <p className="-mt-4 text-xs text-slate-500 dark:text-slate-400">
        ¿Quieres que esta página aparezca en el menú? Se administra desde{" "}
        <Link href="/admin/settings/menu" className="text-violet-700 underline dark:text-sky-400">
          Menú del sitio
        </Link>
        .
      </p>

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Encabezado con título</h2>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                name="showBanner"
                checked={showBanner}
                onChange={(e) => setShowBanner(e.target.checked)}
              />
              Mostrarlo en esta página
            </label>
            {/*
              Independent of showBanner above -- "habrán secciones o partes
              donde no quiero que se vea el nombre de la página": keep the
              background image/logo but skip repeating the title as text
              over it. Only meaningful while the banner itself is shown, so
              disabled (not hidden -- the choice still gets saved) otherwise.
            */}
            {/*
              Deliberately NOT `disabled` -- a disabled checkbox is excluded
              from FormData entirely on submit, which would silently save
              showTitle as false the moment the banner is off, even if it
              was checked, and leave it out of sync once the banner comes
              back on. pointer-events-none + dimming gets the same "not
              interactive right now" look without that data-loss bug.
            */}
            <label
              className={`flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 ${showBanner ? "" : "pointer-events-none opacity-50"}`}
            >
              <input type="checkbox" name="showTitle" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} />
              Mostrar el nombre de la página
            </label>
          </div>
        </div>
        {!showBanner && (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Esta página no tendrá el bloque fijo de título/fondo -- empieza directo con las secciones de abajo (útil si la
            primera sección ya es un video, un slideshow, etc.). Las opciones de abajo quedan guardadas por si lo reactivas.
          </p>
        )}
        {showBanner && !showTitle && (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            El fondo/logo de esta página se mostrará, pero sin el texto del nombre encima.
          </p>
        )}
        {/*
          Kept mounted (not unmounted) when hidden, just visually hidden --
          so toggling the checkbox off and back on doesn't lose whatever
          background/logo was already configured underneath.
        */}
        <div className={showBanner ? undefined : "hidden"}>
          <BackgroundPicker
            initialImageUrl={page.background?.imageUrl ?? null}
            initialColor={page.background?.overlayColor ?? "#3B0764"}
            initialOpacity={page.background?.overlayOpacity ?? 0.5}
            initialBannerImageUrl={page.background?.bannerImageUrl ?? null}
            mediaLibrary={mediaLibrary}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Contenido</h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Agrega el mapa o el formulario de contacto como un componente más, en la sección donde los quieras.
        </p>
        <SectionBlockEditor initialSections={page.sections} mediaLibrary={mediaLibrary} pages={pages} formDefinitions={formDefinitions} />
      </section>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.savedAt && !state.error && <p className="text-sm text-green-700 dark:text-green-400">Guardado.</p>}

      <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-slate-50/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <button
          ref={draftButtonRef}
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="rounded-md border border-violet-700 px-5 py-2 font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:border-violet-500 dark:text-violet-300 dark:hover:bg-slate-800"
        >
          {pending ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          Guardar y publicar
        </button>
        <Link
          href={`/admin/pages/${page.id}/versions`}
          className="ml-auto rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Historial
        </Link>
        <Link
          href={`/admin/pages/${page.id}/preview`}
          target="_blank"
          className="rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Vista previa
        </Link>
      </div>
    </form>
  );
}
