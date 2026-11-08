"use client";

import { useId, useState } from "react";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

export type LinkedinPostValue = { url: string; text: string; date: string; image: string };
export type LinkedinPostsBlockValue = { title: string; posts: LinkedinPostValue[]; visible: number; autoplay: boolean; intervalSeconds: number };

export const MAX_LINKEDIN_POSTS = 5;
export const EMPTY_LINKEDIN_POSTS: LinkedinPostsBlockValue = { title: "Últimas publicaciones en LinkedIn", posts: [], visible: 4, autoplay: true, intervalSeconds: 6 };

const field = "rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-300";
const small = "rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

export function LinkedinPostsBlockEditor({
  value,
  onChange,
  mediaLibrary,
}: {
  value: LinkedinPostsBlockValue;
  onChange: (v: LinkedinPostsBlockValue) => void;
  mediaLibrary: MediaItem[];
}) {
  const uid = useId();
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const setPost = (i: number, patch: Partial<LinkedinPostValue>) =>
    onChange({ ...value, posts: value.posts.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.posts.length) return;
    const posts = [...value.posts];
    [posts[i], posts[j]] = [posts[j], posts[i]];
    onChange({ ...value, posts });
  };
  const badLink = (u: string) => u !== "" && !/^https:\/\/((([a-z]{2,3}|www)\.)?linkedin\.com\/|lnkd\.in\/)\S*$/i.test(u);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Tarjetas compactas con tus últimas publicaciones de LinkedIn (hasta {MAX_LINKEDIN_POSTS}). LinkedIn no permite leerlas automáticamente, así que las llenas tú: pega el enlace de la publicación y un extracto corto.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor={`${uid}-title`} className={label}>Título del bloque</label>
          <input id={`${uid}-title`} value={value.title} maxLength={80} onChange={(e) => onChange({ ...value, title: e.target.value })} className={`${field} mt-1 w-full`} />
        </div>
        <div>
          <label htmlFor={`${uid}-visible`} className={label}>Se ven a la vez</label>
          <select id={`${uid}-visible`} value={value.visible} onChange={(e) => onChange({ ...value, visible: Number(e.target.value) })} className={`${field} mt-1`}>
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.autoplay} onChange={(e) => onChange({ ...value, autoplay: e.target.checked })} /> Rotar solas
        </label>
        {value.autoplay && (
          <div>
            <label htmlFor={`${uid}-int`} className={label}>Cada {value.intervalSeconds} s</label>
            <input id={`${uid}-int`} type="range" min={3} max={15} step={1} value={value.intervalSeconds} onChange={(e) => onChange({ ...value, intervalSeconds: Number(e.target.value) })} className="mt-2 w-32" />
          </div>
        )}
      </div>

      <ol className="space-y-3">
        {value.posts.map((p, i) => (
          <li key={i} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Publicación {i + 1}</p>
              <div className="flex gap-1">
                <button type="button" className={small} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir la publicación ${i + 1}`}>↑</button>
                <button type="button" className={small} onClick={() => move(i, 1)} disabled={i === value.posts.length - 1} aria-label={`Bajar la publicación ${i + 1}`}>↓</button>
                <button type="button" className={`${small} text-red-700 dark:text-red-400`} onClick={() => onChange({ ...value, posts: value.posts.filter((_, k) => k !== i) })}>Quitar</button>
              </div>
            </div>
            <label htmlFor={`${uid}-u${i}`} className={label}>Enlace de la publicación</label>
            <input id={`${uid}-u${i}`} value={p.url} placeholder="https://www.linkedin.com/posts/…" aria-invalid={badLink(p.url)} aria-describedby={badLink(p.url) ? `${uid}-e${i}` : undefined} onChange={(e) => setPost(i, { url: e.target.value.trim() })} className={`${field} mt-1 w-full`} />
            {badLink(p.url) && (
              <p id={`${uid}-e${i}`} className="mt-1 text-xs text-red-700 dark:text-red-400">Debe ser un enlace https de LinkedIn.</p>
            )}
            <label htmlFor={`${uid}-t${i}`} className={`${label} mt-2`}>Extracto ({p.text.length}/280)</label>
            <textarea id={`${uid}-t${i}`} value={p.text} maxLength={280} rows={3} onChange={(e) => setPost(i, { text: e.target.value })} className={`${field} mt-1 w-full`} />
            <div className="mt-2 flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor={`${uid}-d${i}`} className={label}>Fecha (opcional)</label>
                <input id={`${uid}-d${i}`} type="date" value={p.date} onChange={(e) => setPost(i, { date: e.target.value })} className={`${field} mt-1`} />
              </div>
              <div className="flex items-center gap-2">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />
                )}
                <button type="button" className={small} aria-expanded={pickerFor === i} onClick={() => setPickerFor(pickerFor === i ? null : i)}>
                  {p.image ? "Cambiar imagen" : "Añadir imagen (opcional)"}
                </button>
                {p.image && (
                  <button type="button" className={small} onClick={() => setPost(i, { image: "" })}>Quitar imagen</button>
                )}
              </div>
            </div>
            {pickerFor === i && (
              <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <MediaUploadForm onUploaded={(m) => { setPost(i, { image: m.url }); setPickerFor(null); }} />
                <div className="mt-3">
                  <MediaGrid items={mediaLibrary.filter((m) => !m.mimeType?.startsWith("video/"))} onSelect={(m) => { setPost(i, { image: m.url }); setPickerFor(null); }} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={value.posts.length >= MAX_LINKEDIN_POSTS}
        onClick={() => onChange({ ...value, posts: [...value.posts, { url: "", text: "", date: "", image: "" }] })}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Añadir publicación ({value.posts.length}/{MAX_LINKEDIN_POSTS})
      </button>
    </div>
  );
}
