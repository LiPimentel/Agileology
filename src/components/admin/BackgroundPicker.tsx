"use client";

import { useState } from "react";
import type { MediaItem } from "@/components/admin/MediaGrid";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

export function BackgroundPicker({
  initialImageUrl,
  initialColor,
  initialOpacity,
  mediaLibrary,
}: {
  initialImageUrl: string | null;
  initialColor: string;
  initialOpacity: number;
  mediaLibrary: MediaItem[];
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [color, setColor] = useState(initialColor);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-3">
      <input type="hidden" name="backgroundImageUrl" value={imageUrl} readOnly />
      <input type="hidden" name="overlayColor" value={color} readOnly />
      <input type="hidden" name="overlayOpacity" value={opacity} readOnly />

      <div
        className="relative flex h-32 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-cover bg-center"
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      >
        <div className="absolute inset-0" style={{ backgroundColor: color, opacity }} />
        <span className="relative text-sm font-medium text-white">Vista previa</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Color de superposición</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 h-9 w-16" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Transparencia ({Math.round(opacity * 100)}%)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="mt-1 w-40"
          />
        </div>
        {imageUrl && (
          <button type="button" onClick={() => setImageUrl("")} className="text-sm text-red-600 hover:underline">
            Quitar imagen de fondo
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        {pickerOpen ? "Cerrar biblioteca" : "Elegir imagen de fondo"}
      </button>
      {pickerOpen && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <MediaUploadForm onUploaded={(m) => { setImageUrl(m.url); setPickerOpen(false); }} />
          <div className="mt-3">
            <MediaGrid items={mediaLibrary} onSelect={(m) => { setImageUrl(m.url); setPickerOpen(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}
