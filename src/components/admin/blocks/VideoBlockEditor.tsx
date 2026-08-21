"use client";

import { parseVideoEmbed } from "@/lib/video";
import { ALIGN_CLASS, IMAGE_SHAPE_LABELS, VIDEO_SHAPE_WRAPPER_CLASS, type ImageShape } from "@/lib/imageShape";

export type VideoBlockValue = {
  url: string;
  alignment: "left" | "center" | "right";
  shape: ImageShape;
  width: number;
};

export function VideoBlockEditor({ value, onChange }: { value: VideoBlockValue; onChange: (value: VideoBlockValue) => void }) {
  const embed = value.url ? parseVideoEmbed(value.url) : null;
  const shape = value.shape ?? "none";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">URL de YouTube o Vimeo</label>
        <input
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      {value.url && !embed && <p className="text-sm text-amber-600">No se reconoce como enlace de YouTube o Vimeo.</p>}
      {embed && (
        // max-w-3xl/ALIGN_CLASS match BlockRenderer's video case exactly --
        // was capped at max-w-md (28rem) here regardless of alignment, so
        // the editor preview undersold how big a wide video actually
        // publishes at.
        <div className={`max-w-3xl ${ALIGN_CLASS[value.alignment] ?? "mx-auto"}`} style={{ width: `${value.width}%` }}>
          {/*
            circle/oval crop the embed's iframe container into that frame --
            there's no pan/zoom for video the way images have it, an
            embedded player doesn't expose its internal video position to
            reposition (cross-origin), only the container can be shaped/
            sized.
          */}
          <div className={VIDEO_SHAPE_WRAPPER_CLASS[shape]}>
            <iframe
              src={embed.embedUrl}
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              title="Previsualización de video"
            />
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Alineación</label>
          <select
            value={value.alignment}
            onChange={(e) => onChange({ ...value, alignment: e.target.value as VideoBlockValue["alignment"] })}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Forma</label>
          <select
            value={shape}
            onChange={(e) => onChange({ ...value, shape: e.target.value as ImageShape })}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2"
          >
            {(Object.keys(IMAGE_SHAPE_LABELS) as ImageShape[]).map((s) => (
              <option key={s} value={s}>
                {IMAGE_SHAPE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Tamaño ({value.width}%)</label>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={value.width}
            onChange={(e) => onChange({ ...value, width: Number(e.target.value) })}
            className="mt-2 w-40"
          />
        </div>
      </div>
    </div>
  );
}
