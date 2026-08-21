"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { savePost, type PostFormState } from "../actions";
import { BlockEditor, type EditorBlock } from "@/components/admin/BlockEditor";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

const initialState: PostFormState = {};
const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600";

export type PostEditorData = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  excerpt: string | null;
  featuredImage: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishAt: string | null;
  blocks: EditorBlock[];
};

export function PostEditorForm({
  post,
  mediaLibrary,
  pages,
}: {
  post: PostEditorData;
  mediaLibrary: MediaItem[];
  pages: Array<{ slug: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState(savePost, initialState);
  const [featuredImage, setFeaturedImage] = useState(post.featuredImage ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const draftButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pending) draftButtonRef.current?.click();
    }, 30_000);
    return () => clearInterval(id);
  }, [pending]);

  return (
    <form action={formAction} className="space-y-8 pb-16">
      <input type="hidden" name="postId" value={post.id} />
      <input type="hidden" name="featuredImage" value={featuredImage} readOnly />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{post.title || "Nuevo post"}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${post.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
          {post.status === "published" ? "Publicado" : "Borrador"}
        </span>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <label className="block text-sm font-medium text-slate-700">Título</label>
          <input name="title" defaultValue={post.title} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Slug (URL)</label>
          <input name="slug" defaultValue={post.slug} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">Extracto (para la vista de lista)</label>
          <textarea name="excerpt" defaultValue={post.excerpt ?? ""} rows={2} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Etiquetas (separadas por coma)</label>
          <input name="tags" defaultValue={post.tags.join(", ")} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Publicar el (opcional, para agendar)</label>
          <input type="datetime-local" name="publishAt" defaultValue={post.publishAt ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Título SEO</label>
          <input name="seoTitle" defaultValue={post.seoTitle ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Meta descripción SEO</label>
          <input name="seoDescription" defaultValue={post.seoDescription ?? ""} className={inputClass} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Imagen destacada</h2>
        {featuredImage && (
          <Image src={featuredImage} alt="" width={300} height={200} className="mb-3 max-h-40 w-auto rounded-md border border-slate-200" />
        )}
        <button type="button" onClick={() => setPickerOpen((v) => !v)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          {pickerOpen ? "Cerrar" : "Elegir imagen"}
        </button>
        {pickerOpen && (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <MediaUploadForm onUploaded={(m) => { setFeaturedImage(m.url); setPickerOpen(false); }} />
            <div className="mt-3">
              <MediaGrid items={mediaLibrary} onSelect={(m) => { setFeaturedImage(m.url); setPickerOpen(false); }} />
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Contenido</h2>
        <BlockEditor initialBlocks={post.blocks} mediaLibrary={mediaLibrary} pages={pages} />
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
        <Link href={`/admin/posts/${post.id}/preview`} target="_blank" className="ml-auto rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-white">
          Vista previa
        </Link>
      </div>
    </form>
  );
}
