"use client";

import { useState } from "react";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { Carousel, type CarouselValue } from "@/components/blocks/Carousel";
import { MAX_CAROUSEL_SLIDES } from "@/lib/blocks";
import { parseVideoEmbed } from "@/lib/video";

export type CarouselBlockValue = CarouselValue;

export const EMPTY_CAROUSEL: CarouselBlockValue = {
  slides: [],
  aspect: "16/9",
  showArrows: true,
  showDots: true,
  autoplay: false,
  intervalSeconds: 6,
  width: 100,
};

const field = "rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const small = "rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

export function CarouselBlockEditor({
  value,
  onChange,
  mediaLibrary,
}: {
  value: CarouselBlockValue;
  onChange: (value: CarouselBlockValue) => void;
  mediaLibrary: MediaItem[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const slides = value.slides ?? [];
  const full = slides.length >= MAX_CAROUSEL_SLIDES;
  const videoOk = videoUrl ? parseVideoEmbed(videoUrl) !== null : true;

  const setSlides = (next: CarouselBlockValue["slides"]) => onChange({ ...value, slides: next });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setSlides(next);
  };
  const addImage = (url: string, altText = "") => {
    if (full) return;
    setSlides([...slides, { kind: "image", url, altText }]);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-4">
      {slides.length > 0 && (
        <div className="pointer-events-none">
          {/* Live preview with the same component the public page uses. */}
          <Carousel value={{ ...value, autoplay: false }} />
        </div>
      )}

      <ol className="space-y-2">
        {slides.map((s, i) => (
          <li key={i} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 p-2 dark:border-slate-700">
            <span className="w-6 text-sm text-slate-500">{i + 1}</span>
            {s.kind === "image" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt="" className="h-12 w-16 rounded object-cover" />
                <input
                  aria-label={`Texto alternativo de la diapositiva ${i + 1}`}
                  placeholder="Descripción de la imagen (para lectores de pantalla)"
                  value={s.altText ?? ""}
                  onChange={(e) => setSlides(slides.map((x, k) => (k === i && x.kind === "image" ? { ...x, altText: e.target.value } : x)))}
                  className={`${field} min-w-[12rem] flex-1 py-1 text-sm`}
                />
              </>
            ) : (
              <span className="min-w-[12rem] flex-1 truncate text-sm text-slate-700 dark:text-slate-300">▶ Video: {s.url}</span>
            )}
            <div className="flex gap-1">
              <button type="button" className={small} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir diapositiva ${i + 1}`}>↑</button>
              <button type="button" className={small} disabled={i === slides.length - 1} onClick={() => move(i, 1)} aria-label={`Bajar diapositiva ${i + 1}`}>↓</button>
              <button type="button" className={`${small} text-red-600`} onClick={() => setSlides(slides.filter((_, k) => k !== i))} aria-label={`Quitar diapositiva ${i + 1}`}>Quitar</button>
            </div>
          </li>
        ))}
      </ol>
      {slides.length === 0 && <p className="text-sm text-slate-500">Aún no hay diapositivas. Añade imágenes o videos.</p>}
      {full && <p className="text-sm text-amber-600">Máximo {MAX_CAROUSEL_SLIDES} diapositivas.</p>}

      <div className="space-y-3">
        <button type="button" disabled={full} onClick={() => setPickerOpen((v) => !v)} className={small + " px-3 py-1.5 text-sm"}>
          {pickerOpen ? "Cerrar biblioteca" : "Añadir imagen (biblioteca / subir nueva)"}
        </button>
        {pickerOpen && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <MediaUploadForm onUploaded={(m) => addImage(m.url)} />
            <div className="mt-3">
              <MediaGrid items={mediaLibrary} onSelect={(m) => addImage(m.url, m.altText ?? "")} />
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-[14rem] flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="carousel-video-url">
              Añadir video (YouTube o Vimeo)
            </label>
            <input
              id="carousel-video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`${field} mt-1 w-full`}
            />
            {!videoOk && <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">No se reconoce como enlace de YouTube o Vimeo.</p>}
          </div>
          <button
            type="button"
            disabled={full || !videoUrl || !videoOk}
            onClick={() => {
              setSlides([...slides, { kind: "video", url: videoUrl.trim() }]);
              setVideoUrl("");
            }}
            className={`${small} mt-7 px-3 py-2 text-sm`}
          >
            Añadir video
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Proporción</label>
          <select value={value.aspect} onChange={(e) => onChange({ ...value, aspect: e.target.value as CarouselBlockValue["aspect"] })} className={`${field} mt-1`}>
            <option value="16/9">Panorámica (16:9)</option>
            <option value="4/3">Clásica (4:3)</option>
            <option value="1/1">Cuadrada (1:1)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tamaño ({value.width}%)</label>
          <input type="range" min={20} max={100} step={5} value={value.width} onChange={(e) => onChange({ ...value, width: Number(e.target.value) })} className="mt-3 w-40" />
        </div>
        <label className="mt-7 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.showArrows} onChange={(e) => onChange({ ...value, showArrows: e.target.checked })} /> Flechas
        </label>
        <label className="mt-7 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.showDots} onChange={(e) => onChange({ ...value, showDots: e.target.checked })} /> Puntos
        </label>
        <label className="mt-7 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.autoplay} onChange={(e) => onChange({ ...value, autoplay: e.target.checked })} /> Avance automático
        </label>
        {value.autoplay && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cada {value.intervalSeconds} s</label>
            <input type="range" min={3} max={15} step={1} value={value.intervalSeconds} onChange={(e) => onChange({ ...value, intervalSeconds: Number(e.target.value) })} className="mt-2 w-32" />
          </div>
        )}
      </div>
      {value.autoplay && <p className="text-xs text-slate-500">Se detiene al pasar el ratón, con el botón de pausa, si el visitante pidió «reducir movimiento», y mientras se muestra un video.</p>}
    </div>
  );
}
