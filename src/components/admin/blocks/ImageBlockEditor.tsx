"use client";

import { useState } from "react";
import Image from "next/image";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

export type ImageBlockValue = { url: string; altText: string; alignment: "left" | "center" | "right" };

export function ImageBlockEditor({
  value,
  onChange,
  mediaLibrary,
}: {
  value: ImageBlockValue;
  onChange: (value: ImageBlockValue) => void;
  mediaLibrary: MediaItem[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-3">
      {value.url ? (
        <Image src={value.url} alt={value.altText} width={400} height={300} unoptimized className="max-h-48 w-auto rounded-md border border-slate-200" />
      ) : (
        <p className="text-sm text-slate-500">Sin imagen seleccionada.</p>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">Texto alternativo (SEO/accesibilidad)</label>
        <input
          value={value.altText}
          onChange={(e) => onChange({ ...value, altText: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Alineación</label>
        <select
          value={value.alignment}
          onChange={(e) => onChange({ ...value, alignment: e.target.value as ImageBlockValue["alignment"] })}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
        </select>
      </div>
      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        {pickerOpen ? "Cerrar biblioteca" : "Elegir de la biblioteca / subir nueva"}
      </button>
      {pickerOpen && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <MediaUploadForm onUploaded={(m) => { onChange({ ...value, url: m.url }); setPickerOpen(false); }} />
          <div className="mt-3">
            <MediaGrid items={mediaLibrary} onSelect={(m) => { onChange({ ...value, url: m.url, altText: value.altText || (m.altText ?? "") }); setPickerOpen(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}
