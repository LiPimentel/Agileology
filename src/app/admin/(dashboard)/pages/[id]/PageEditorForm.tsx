"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { savePage, type PageFormState } from "../actions";
import { BackgroundPicker } from "@/components/admin/BackgroundPicker";
import { SectionBlockEditor, type EditorSection } from "@/components/admin/SectionBlockEditor";
import type { MediaItem } from "@/components/admin/MediaGrid";

const initialState: PageFormState = {};
const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600";

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
  background: { imageUrl: string | null; overlayColor: string; overlayOpacity: number } | null;
  sections: EditorSection[];
  mapComponent: { address: string } | null;
  contactFormComponent: { enabledFields: string[] } | null;
};

export function PageEditorForm({
  page,
  mediaLibrary,
  pages,
}: {
  page: PageEditorData;
  mediaLibrary: MediaItem[];
  pages: Array<{ slug: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState(savePage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const draftButtonRef = useRef<HTMLButtonElement>(null);

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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{page.title || "Nueva página"}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${page.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
          {page.status === "published" ? "Publicada" : "Borrador"}
        </span>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <label className="block text-sm font-medium text-slate-700">Título</label>
          <input name="title" defaultValue={page.title} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Slug (URL)</label>
          <input name="slug" defaultValue={page.slug} disabled={page.isSystem} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Título SEO</label>
          <input name="seoTitle" defaultValue={page.seoTitle ?? ""} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">Meta descripción SEO</label>
          <textarea name="seoDescription" defaultValue={page.seoDescription ?? ""} rows={2} className={inputClass} />
        </div>
      </section>
      <p className="-mt-4 text-xs text-slate-500">
        ¿Quieres que esta página aparezca en el menú? Se administra desde{" "}
        <Link href="/admin/settings/menu" className="text-violet-700 underline">
          Menú del sitio
        </Link>
        .
      </p>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Fondo y superposición</h2>
        <BackgroundPicker
          initialImageUrl={page.background?.imageUrl ?? null}
          initialColor={page.background?.overlayColor ?? "#3B0764"}
          initialOpacity={page.background?.overlayOpacity ?? 0.5}
          mediaLibrary={mediaLibrary}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Contenido</h2>
        <SectionBlockEditor initialSections={page.sections} mediaLibrary={mediaLibrary} pages={pages} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Componentes de contacto (opcional)</h2>
        <ContactComponentsFields page={page} />
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.savedAt && !state.error && <p className="text-sm text-green-700">Guardado.</p>}

      <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-slate-50/95 p-4 backdrop-blur">
        <button
          ref={draftButtonRef}
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="rounded-md border border-violet-700 px-5 py-2 font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
        >
          Guardar y publicar
        </button>
        <Link
          href={`/admin/pages/${page.id}/versions`}
          className="ml-auto rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-white"
        >
          Historial
        </Link>
        <Link
          href={`/admin/pages/${page.id}/preview`}
          target="_blank"
          className="rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-white"
        >
          Vista previa
        </Link>
      </div>
    </form>
  );
}

function ContactComponentsFields({ page }: { page: PageEditorData }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="includeMap" defaultChecked={!!page.mapComponent} />
          Incluir mapa de ubicación
        </label>
        <input
          name="mapAddress"
          defaultValue={page.mapComponent?.address ?? ""}
          placeholder="Dirección"
          className={`${inputClass} mt-2`}
        />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="includeContactForm" defaultChecked={!!page.contactFormComponent} />
          Incluir formulario de contacto
        </label>
        <div className="mt-2 flex gap-4 text-sm text-slate-700">
          {["name", "email", "message"].map((f) => (
            <label key={f} className="flex items-center gap-1">
              <input
                type="checkbox"
                name="contactFields"
                value={f}
                defaultChecked={page.contactFormComponent?.enabledFields.includes(f) ?? true}
              />
              {f === "name" ? "Nombre" : f === "email" ? "Email" : "Mensaje"}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
