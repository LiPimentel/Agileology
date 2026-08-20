"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import {
  IMAGE_SHAPE_IMG_CLASS,
  IMAGE_SHAPE_LABELS,
  IMAGE_SHAPE_WRAPPER_CLASS,
  isCroppableShape,
  type ImageShape,
} from "@/lib/imageShape";

export type ImageBlockValue = {
  url: string;
  altText: string;
  alignment: "left" | "center" | "right";
  shape: ImageShape;
  focalX: number;
  focalY: number;
  zoom: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Drag-to-pan + zoom preview for circle/oval shapes: the whole point of
 * this control is "mover la imagen dentro para ajustarla" -- pointer-drag
 * updates focalX/focalY (the CSS object-position the public render uses),
 * a slider drives zoom. Only shown for shapes that actually crop the image
 * (see CROPPABLE_SHAPES) -- none/rounded show the whole image, nothing to
 * pan.
 */
function ImageShapeAdjuster({
  shape,
  url,
  altText,
  focalX,
  focalY,
  zoom,
  onChange,
}: {
  shape: ImageShape;
  url: string;
  altText: string;
  focalX: number;
  focalY: number;
  zoom: number;
  onChange: (patch: { focalX?: number; focalY?: number; zoom?: number }) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const dxPct = (e.movementX / rect.width) * 100;
    const dyPct = (e.movementY / rect.height) * 100;
    // Dragging right/down should feel like moving the photo itself
    // right/down (revealing more of its opposite edge) -- object-position
    // works the other way round, so subtract the delta.
    onChange({ focalX: clamp(focalX - dxPct, 0, 100), focalY: clamp(focalY - dyPct, 0, 100) });
  }
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div>
      <div
        ref={boxRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`relative w-[200px] max-w-full cursor-move touch-none border border-slate-300 ${IMAGE_SHAPE_WRAPPER_CLASS[shape]}`}
      >
        <Image
          src={url}
          alt={altText}
          fill
          unoptimized
          draggable={false}
          className={`select-none ${IMAGE_SHAPE_IMG_CLASS[shape]}`}
          style={{ objectPosition: `${focalX}% ${focalY}%`, transform: `scale(${zoom})` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">Arrastra la imagen para ajustarla dentro de la forma.</p>
      <label className="mt-2 block w-[200px] max-w-full text-xs font-medium text-slate-700">
        Zoom ({zoom.toFixed(1)}x)
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => onChange({ zoom: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
    </div>
  );
}

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
  const shape = value.shape ?? "none";
  const focalX = value.focalX ?? 50;
  const focalY = value.focalY ?? 50;
  const zoom = value.zoom ?? 1;
  const croppable = isCroppableShape(shape);

  return (
    <div className="space-y-3">
      {value.url ? (
        croppable ? (
          <ImageShapeAdjuster
            shape={shape}
            url={value.url}
            altText={value.altText}
            focalX={focalX}
            focalY={focalY}
            zoom={zoom}
            onChange={(patch) => onChange({ ...value, ...patch })}
          />
        ) : (
          <div className="max-w-[200px]">
            <Image
              src={value.url}
              alt={value.altText}
              width={400}
              height={300}
              unoptimized
              className={`border border-slate-200 ${IMAGE_SHAPE_IMG_CLASS[shape]}`}
            />
          </div>
        )
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
      <div className="flex flex-wrap gap-4">
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
