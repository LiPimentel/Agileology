"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { ResizableBlockBox } from "@/components/admin/blocks/ResizableBlockBox";
import {
  ALIGN_CLASS,
  FRAMED_IMG_CLASS,
  IMAGE_FRAMES,
  IMAGE_FRAME_LABELS,
  IMAGE_SHAPE_IMG_CLASS,
  IMAGE_SHAPE_LABELS,
  framedImageStyle,
  framedWrapperClass,
  imageMaxWidthClass,
  isCroppableShape,
  isFramedImage,
  IMAGE_HOVER_EFFECTS,
  IMAGE_HOVER_LABELS,
  type ImageFrame,
  type ImageHoverEffect,
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
  width: number;
  /** Fixed-proportion window the picture is cropped to; absent/"auto" = the whole picture. */
  frame?: ImageFrame;
  /** Effect on mouse-over (public site). */
  hoverEffect?: ImageHoverEffect;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Pan + zoom a picture inside its window: drag it with the mouse or a finger ("arrástrala hasta
 * que se vea lo que me interesa"), or use the sliders (keyboard friendly). The window is exactly
 * what the page will show: same classes and same maths as BlockRenderer, sized with the same
 * maxWidth/width%/alignment, so what you adjust here is what gets published.
 *
 * `boxAspect` is set in free-layout sections, where the window is the section's own box
 * (width / height of that box) instead of a chosen "Marco".
 */
function ImageShapeAdjuster({
  shape,
  frame,
  boxAspect,
  url,
  altText,
  focalX,
  focalY,
  zoom,
  width,
  alignment,
  onChange,
}: {
  shape: ImageShape;
  frame: ImageFrame;
  boxAspect?: number;
  url: string;
  altText: string;
  focalX: number;
  focalY: number;
  zoom: number;
  width: number;
  alignment: ImageBlockValue["alignment"];
  onChange: (patch: { focalX?: number; focalY?: number; zoom?: number; width?: number }) => void;
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
    // The zoom magnifies everything after object-position, so a screen-pixel drag is divided by it
    // to still land where the pointer is (otherwise a small drag at 2.6x jumped far past).
    const dxPct = (e.movementX / rect.width / zoom) * 100;
    const dyPct = (e.movementY / rect.height / zoom) * 100;
    // Dragging right/down should feel like moving the photo itself right/down (revealing more of
    // its opposite edge); object-position works the other way round, so subtract the delta.
    onChange({ focalX: clamp(focalX - dxPct, 0, 100), focalY: clamp(focalY - dyPct, 0, 100) });
  }
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const rounding = shape === "rounded" ? "rounded-2xl" : "rounded-md";
  const windowClass = boxAspect ? `w-full overflow-hidden ${rounding}` : framedWrapperClass(shape, frame);
  const maxWidthClass = imageMaxWidthClass(shape);
  const slider = "mt-1 w-full";
  const label = "block text-xs font-medium text-slate-700 dark:text-slate-300";

  return (
    <div>
      {/*
        The corner handle (bottom-right, added by ResizableBlockBox) drags `width` directly on the
        canvas; the "Tamaño" slider below stays too, for precise values.
      */}
      <ResizableBlockBox width={width} onWidthChange={(w) => onChange({ width: w })} maxWidthClass={maxWidthClass} alignClass={ALIGN_CLASS[alignment] ?? "mx-auto"}>
        <div
          ref={boxRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={boxAspect ? { aspectRatio: String(boxAspect) } : undefined}
          className={`relative cursor-move touch-none border border-slate-300 ${windowClass}`}
        >
          <Image src={url} alt={altText} fill draggable={false} className={`select-none ${FRAMED_IMG_CLASS}`} style={framedImageStyle(focalX, focalY, zoom)} />
        </div>
      </ResizableBlockBox>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Arrastra la imagen dentro del recuadro para elegir qué parte se ve, o usa los controles de abajo.
        </p>
        <button type="button" onClick={() => onChange({ focalX: 50, focalY: 50, zoom: 1 })} className="shrink-0 text-xs text-violet-700 underline dark:text-sky-400">
          Centrar
        </button>
      </div>
      <div className="mt-2 grid max-w-md gap-3 sm:grid-cols-3">
        <label className={label}>
          Zoom ({zoom.toFixed(1)}x)
          <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => onChange({ zoom: Number(e.target.value) })} className={slider} />
        </label>
        <label className={label}>
          Horizontal ({Math.round(focalX)}%)
          <input type="range" min={0} max={100} step={1} value={focalX} onChange={(e) => onChange({ focalX: Number(e.target.value) })} className={slider} />
        </label>
        <label className={label}>
          Vertical ({Math.round(focalY)}%)
          <input type="range" min={0} max={100} step={1} value={focalY} onChange={(e) => onChange({ focalY: Number(e.target.value) })} className={slider} />
        </label>
      </div>
    </div>
  );
}

export function ImageBlockEditor({
  value,
  onChange,
  mediaLibrary,
  boxAspect,
}: {
  value: ImageBlockValue;
  onChange: (value: ImageBlockValue) => void;
  mediaLibrary: MediaItem[];
  /** Free-layout section: width/height of the block's box, which is the window. Hides the "Marco" menu. */
  boxAspect?: number;
}) {
  const uid = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const shape = value.shape ?? "none";
  const frame: ImageFrame = value.frame ?? "auto";
  const focalX = value.focalX ?? 50;
  const focalY = value.focalY ?? 50;
  const zoom = value.zoom ?? 1;
  const width = value.width ?? 100;
  // circle/oval have their own window; in a free box the box is the window. Otherwise it is the chosen "Marco".
  const framed = boxAspect !== undefined || isFramedImage(shape, frame);
  const selectCls = "mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="space-y-3">
      {value.url ? (
        framed ? (
          <ImageShapeAdjuster
            shape={shape}
            frame={frame}
            boxAspect={boxAspect}
            url={value.url}
            altText={value.altText}
            focalX={focalX}
            focalY={focalY}
            zoom={zoom}
            width={width}
            alignment={value.alignment}
            onChange={(patch) => onChange({ ...value, ...patch })}
          />
        ) : (
          // Same maxWidth/width%/alignment classes BlockRenderer applies publicly.
          <ResizableBlockBox
            width={width}
            onWidthChange={(w) => onChange({ ...value, width: w })}
            maxWidthClass={imageMaxWidthClass(shape)}
            alignClass={ALIGN_CLASS[value.alignment] ?? "mx-auto"}
          >
            <Image src={value.url} alt={value.altText} width={800} height={600} className={`w-full border border-slate-200 ${IMAGE_SHAPE_IMG_CLASS[shape]}`} />
          </ResizableBlockBox>
        )
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">Sin imagen seleccionada.</p>
      )}

      {value.url && !framed && (
        <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Se muestra la imagen completa. Para <strong>recortarla y arrastrarla</strong> hasta que se vea lo que te interesa, elige un <strong>Marco</strong> (por ejemplo «Panorámico»), o una forma como óvalo o círculo.
        </p>
      )}

      <div>
        <label htmlFor={`${uid}-alt`} className={labelCls}>Texto alternativo (SEO/accesibilidad)</label>
        <input
          id={`${uid}-alt`}
          value={value.altText}
          onChange={(e) => onChange({ ...value, altText: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor={`${uid}-align`} className={labelCls}>Alineación</label>
          <select id={`${uid}-align`} value={value.alignment} onChange={(e) => onChange({ ...value, alignment: e.target.value as ImageBlockValue["alignment"] })} className={selectCls}>
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-shape`} className={labelCls}>Forma</label>
          <select id={`${uid}-shape`} value={shape} onChange={(e) => onChange({ ...value, shape: e.target.value as ImageShape })} className={selectCls}>
            {(Object.keys(IMAGE_SHAPE_LABELS) as ImageShape[]).map((s) => (
              <option key={s} value={s}>{IMAGE_SHAPE_LABELS[s]}</option>
            ))}
          </select>
        </div>
        {boxAspect === undefined && !isCroppableShape(shape) && (
          <div>
            <label htmlFor={`${uid}-frame`} className={labelCls}>Marco</label>
            <select id={`${uid}-frame`} value={frame} onChange={(e) => onChange({ ...value, frame: e.target.value as ImageFrame })} className={selectCls}>
              {IMAGE_FRAMES.map((f) => (
                <option key={f} value={f}>{IMAGE_FRAME_LABELS[f]}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor={`${uid}-hover`} className={labelCls}>Efecto al pasar el mouse</label>
          <select id={`${uid}-hover`} value={value.hoverEffect ?? "none"} onChange={(e) => onChange({ ...value, hoverEffect: e.target.value as ImageHoverEffect })} className={selectCls}>
            {IMAGE_HOVER_EFFECTS.map((f) => (
              <option key={f} value={f}>{IMAGE_HOVER_LABELS[f]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-width`} className={labelCls}>Tamaño ({width}%)</label>
          <input id={`${uid}-width`} type="range" min={20} max={100} step={5} value={width} onChange={(e) => onChange({ ...value, width: Number(e.target.value) })} className="mt-3 w-40" />
        </div>
      </div>
      <button
        type="button"
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((v) => !v)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {pickerOpen ? "Cerrar biblioteca" : "Elegir de la biblioteca / subir nueva"}
      </button>
      {pickerOpen && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <MediaUploadForm onUploaded={(m) => { onChange({ ...value, url: m.url }); setPickerOpen(false); }} />
          <div className="mt-3">
            <MediaGrid items={mediaLibrary} onSelect={(m) => { onChange({ ...value, url: m.url, altText: value.altText || (m.altText ?? "") }); setPickerOpen(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}
