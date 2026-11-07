"use client";

import { useId, useState } from "react";
import { isUploadedVideo, parseVideoEmbed } from "@/lib/video";
import { ALIGN_CLASS, IMAGE_SHAPE_LABELS, VIDEO_SHAPE_WRAPPER_CLASS, type ImageShape } from "@/lib/imageShape";
import { ResizableBlockBox } from "@/components/admin/blocks/ResizableBlockBox";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

export type VideoBlockValue = {
  url: string;
  alignment: "left" | "center" | "right";
  shape: ImageShape;
  width: number;
};

const field = "rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const small = "rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

export function VideoBlockEditor({
  value,
  onChange,
  mediaLibrary = [],
}: {
  value: VideoBlockValue;
  onChange: (value: VideoBlockValue) => void;
  mediaLibrary?: MediaItem[];
}) {
  const uid = useId();
  const uploaded = isUploadedVideo(value.url);
  // Which way the video is being set. Starts from what the block already holds.
  const [mode, setMode] = useState<"link" | "file">(uploaded ? "file" : "link");
  const [pickerOpen, setPickerOpen] = useState(false);
  const embed = !uploaded && value.url ? parseVideoEmbed(value.url) : null;
  const shape = value.shape ?? "none";
  const videos = mediaLibrary.filter((m) => m.mimeType?.startsWith("video/"));
  const hasPreview = uploaded || Boolean(embed);
  // circle/oval crop the picture; the rest show the whole video.
  const fileFit = shape === "circle" || shape === "oval" ? "object-cover" : "object-contain bg-black";

  function chooseMode(next: "link" | "file") {
    setMode(next);
    setPickerOpen(false);
    // Don't keep a value that doesn't belong to the chosen way (a file path in the link box, or the reverse).
    if (next === "link" && uploaded) onChange({ ...value, url: "" });
    if (next === "file" && value.url && !uploaded) onChange({ ...value, url: "" });
  }
  function pick(url: string) {
    onChange({ ...value, url });
    setPickerOpen(false);
  }

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Origen del video</legend>
        <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2">
            <input type="radio" name={`${uid}-mode`} checked={mode === "link"} onChange={() => chooseMode("link")} /> Enlace de YouTube o Vimeo
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name={`${uid}-mode`} checked={mode === "file"} onChange={() => chooseMode("file")} /> Archivo de video (subir o de la biblioteca)
          </label>
        </div>
      </fieldset>

      {mode === "link" ? (
        <div>
          <label htmlFor={`${uid}-url`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">URL de YouTube o Vimeo</label>
          <input
            id={`${uid}-url`}
            value={value.url}
            onChange={(e) => onChange({ ...value, url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            aria-invalid={Boolean(value.url) && !embed}
            aria-describedby={value.url && !embed ? `${uid}-url-error` : undefined}
            className={`${field} mt-1 w-full`}
          />
          {value.url && !embed && <p id={`${uid}-url-error`} role="alert" className="mt-1 text-sm text-amber-800 dark:text-amber-300">No se reconoce como enlace de YouTube o Vimeo.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <button type="button" aria-expanded={pickerOpen} aria-controls={`${uid}-picker`} onClick={() => setPickerOpen((v) => !v)} className={small}>
            {pickerOpen ? "Cerrar biblioteca" : uploaded ? "Cambiar video (subir o de la biblioteca)" : "Elegir de la biblioteca / subir un video"}
          </button>
          <p className="text-xs text-slate-600 dark:text-slate-400">MP4 o WebM, máximo 25 MB. Se reproduce con controles (pausa, volumen y pantalla completa). Si el video tiene voz, añade en la página una transcripción o subtítulos: este reproductor no los genera.</p>
          {pickerOpen && (
            <div id={`${uid}-picker`} className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <MediaUploadForm accept="video/mp4,video/webm" label="Subir video" onUploaded={(m) => pick(m.url)} />
              <div className="mt-3">
                {videos.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">Aún no hay videos en la biblioteca.</p>
                ) : (
                  <MediaGrid items={videos} onSelect={(m) => pick(m.url)} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasPreview && (
        // max-w-3xl/ALIGN_CLASS match BlockRenderer's video case exactly. The corner handle drags
        // "Tamaño" directly, same as images -- the slider below stays for precise/typed values.
        <ResizableBlockBox
          width={value.width}
          onWidthChange={(w) => onChange({ ...value, width: w })}
          maxWidthClass="max-w-3xl"
          alignClass={ALIGN_CLASS[value.alignment] ?? "mx-auto"}
        >
          <div className={VIDEO_SHAPE_WRAPPER_CLASS[shape]}>
            {uploaded ? (
              <video src={value.url} controls playsInline preload="metadata" className={`h-full w-full ${fileFit}`} />
            ) : (
              <iframe src={embed!.embedUrl} className="h-full w-full" sandbox="allow-scripts allow-same-origin allow-presentation" title="Previsualización de video" />
            )}
          </div>
        </ResizableBlockBox>
      )}

      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor={`${uid}-align`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Alineación</label>
          <select id={`${uid}-align`} value={value.alignment} onChange={(e) => onChange({ ...value, alignment: e.target.value as VideoBlockValue["alignment"] })} className={`${field} mt-1`}>
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-shape`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Forma</label>
          <select id={`${uid}-shape`} value={shape} onChange={(e) => onChange({ ...value, shape: e.target.value as ImageShape })} className={`${field} mt-1`}>
            {(Object.keys(IMAGE_SHAPE_LABELS) as ImageShape[]).map((s) => (
              <option key={s} value={s}>{IMAGE_SHAPE_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-width`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tamaño ({value.width}%)</label>
          <input id={`${uid}-width`} type="range" min={20} max={100} step={5} value={value.width} onChange={(e) => onChange({ ...value, width: Number(e.target.value) })} className="mt-2 w-40" />
        </div>
      </div>
    </div>
  );
}
