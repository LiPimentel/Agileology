"use client";

import { useState } from "react";
import type { MediaItem } from "@/components/admin/MediaGrid";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

export type BackgroundValue = { imageUrl: string; color: string; opacity: number };

export function BackgroundPicker({
  initialImageUrl,
  initialColor,
  initialOpacity,
  mediaLibrary,
  value,
  onChange,
  compact,
}: {
  initialImageUrl: string | null;
  initialColor: string;
  initialOpacity: number;
  mediaLibrary: MediaItem[];
  // Controlled mode (used for per-section backgrounds, where the caller
  // owns the value as part of a larger section/editor state and
  // serializes it itself) -- when omitted, this manages its own state and
  // writes hidden inputs instead (the original page-level background
  // usage, unchanged).
  value?: BackgroundValue;
  onChange?: (value: BackgroundValue) => void;
  compact?: boolean;
}) {
  const [localImageUrl, setLocalImageUrl] = useState(initialImageUrl ?? "");
  const [localColor, setLocalColor] = useState(initialColor);
  const [localOpacity, setLocalOpacity] = useState(initialOpacity);
  const [pickerOpen, setPickerOpen] = useState(false);

  const controlled = value !== undefined && onChange !== undefined;
  const imageUrl = controlled ? value.imageUrl : localImageUrl;
  const color = controlled ? value.color : localColor;
  const opacity = controlled ? value.opacity : localOpacity;

  function set(next: Partial<BackgroundValue>) {
    if (controlled) {
      onChange({ imageUrl, color, opacity, ...next });
    } else {
      if (next.imageUrl !== undefined) setLocalImageUrl(next.imageUrl);
      if (next.color !== undefined) setLocalColor(next.color);
      if (next.opacity !== undefined) setLocalOpacity(next.opacity);
    }
  }

  return (
    <div className="space-y-3">
      {!controlled && (
        <>
          <input type="hidden" name="backgroundImageUrl" value={imageUrl} readOnly />
          <input type="hidden" name="overlayColor" value={color} readOnly />
          <input type="hidden" name="overlayOpacity" value={opacity} readOnly />
        </>
      )}

      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-cover bg-center ${compact ? "h-20" : "h-32"}`}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      >
        <div className="absolute inset-0" style={{ backgroundColor: color, opacity }} />
        <span className="relative text-sm font-medium text-white">Vista previa</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Color de superposición</label>
          <input type="color" value={color} onChange={(e) => set({ color: e.target.value })} className="mt-1 h-9 w-16" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Transparencia ({Math.round(opacity * 100)}%)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => set({ opacity: Number(e.target.value) })}
            className="mt-1 w-40"
          />
        </div>
        {imageUrl && (
          <button type="button" onClick={() => set({ imageUrl: "" })} className="text-sm text-red-600 hover:underline">
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
          <MediaUploadForm onUploaded={(m) => { set({ imageUrl: m.url }); setPickerOpen(false); }} />
          <div className="mt-3">
            <MediaGrid items={mediaLibrary} onSelect={(m) => { set({ imageUrl: m.url }); setPickerOpen(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}
