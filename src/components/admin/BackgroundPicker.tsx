"use client";

import { useId, useRef, useState } from "react";
import { backgroundPictureStyle } from "@/lib/backgroundPicture";
import type { MediaItem } from "@/components/admin/MediaGrid";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

export type BackgroundValue = { imageUrl: string; color: string; opacity: number; videoUrl: string; gradientEnd: string; focalX: number; focalY: number; zoom: number };

const IMAGE_ITEMS = (items: MediaItem[]) => items.filter((i) => !i.mimeType?.startsWith("video/"));
const VIDEO_ITEMS = (items: MediaItem[]) => items.filter((i) => i.mimeType?.startsWith("video/"));

export function BackgroundPicker({
  initialImageUrl,
  initialColor,
  initialOpacity,
  initialVideoUrl,
  initialBannerImageUrl,
  initialFocalX,
  initialFocalY,
  initialZoom,
  mediaLibrary,
  value,
  onChange,
  compact,
}: {
  initialImageUrl: string | null;
  initialColor: string;
  initialOpacity: number;
  // Page-level only -- the page background has no video tab, only sections
  // do (see `compact` below).
  initialVideoUrl?: string | null;
  // Page-level only (uncontrolled mode) -- see the field below. A section
  // background (controlled mode, `compact`) doesn't have a title/banner to
  // place this kind of image in front of.
  initialBannerImageUrl?: string | null;
  // Page-level only: where the background picture is positioned (uncontrolled mode; controlled mode reads `value`).
  initialFocalX?: number;
  initialFocalY?: number;
  initialZoom?: number;
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
  const [localVideoUrl, setLocalVideoUrl] = useState(initialVideoUrl ?? "");
  const [localGradientEnd, setLocalGradientEnd] = useState("");
  const [localFocalX, setLocalFocalX] = useState(initialFocalX ?? 50);
  const [localFocalY, setLocalFocalY] = useState(initialFocalY ?? 50);
  const [localZoom, setLocalZoom] = useState(initialZoom ?? 1);
  const [bannerImageUrl, setBannerImageUrl] = useState(initialBannerImageUrl ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);

  const controlled = value !== undefined && onChange !== undefined;
  const imageUrl = controlled ? value.imageUrl : localImageUrl;
  const color = controlled ? value.color : localColor;
  const opacity = controlled ? value.opacity : localOpacity;
  const videoUrl = controlled ? value.videoUrl : localVideoUrl;
  const gradientEnd = controlled ? value.gradientEnd : localGradientEnd;
  const focalX = controlled ? value.focalX : localFocalX;
  const focalY = controlled ? value.focalY : localFocalY;
  const zoom = controlled ? value.zoom : localZoom;
  const isGradient = Boolean(gradientEnd);

  // Which of the three tabs is open -- only meaningful in compact (section)
  // mode, which is the only one with a Video tab (see the client's own
  // reference screenshot: "Fondo de la sección" -> Color / Imagen / Video).
  const [tab, setTab] = useState<"color" | "image" | "video">(videoUrl ? "video" : imageUrl ? "image" : "color");

  function set(next: Partial<BackgroundValue>) {
    if (controlled) {
      onChange({ imageUrl, color, opacity, videoUrl, gradientEnd, focalX, focalY, zoom, ...next });
    } else {
      if (next.imageUrl !== undefined) setLocalImageUrl(next.imageUrl);
      if (next.color !== undefined) setLocalColor(next.color);
      if (next.opacity !== undefined) setLocalOpacity(next.opacity);
      if (next.videoUrl !== undefined) setLocalVideoUrl(next.videoUrl);
      if (next.gradientEnd !== undefined) setLocalGradientEnd(next.gradientEnd);
      if (next.focalX !== undefined) setLocalFocalX(next.focalX);
      if (next.focalY !== undefined) setLocalFocalY(next.focalY);
      if (next.zoom !== undefined) setLocalZoom(next.zoom);
    }
  }

  // Image and video are mutually exclusive as the actual background media
  // (matches the tabbed reference: picking one clears the other), while
  // color/opacity stays an overlay tint on top of whichever is active in
  // either case.
  function pickImage(url: string) {
    set({ imageUrl: url, videoUrl: "", focalX: 50, focalY: 50, zoom: 1 });
    setPickerOpen(false);
  }
  function pickVideo(url: string) {
    set({ videoUrl: url, imageUrl: "" });
    setPickerOpen(false);
  }

  return (
    <div className="space-y-3">
      {!controlled && (
        <>
          <input type="hidden" name="backgroundImageUrl" value={imageUrl} readOnly />
          <input type="hidden" name="overlayColor" value={color} readOnly />
          <input type="hidden" name="overlayOpacity" value={opacity} readOnly />
          <input type="hidden" name="backgroundFocalX" value={focalX} readOnly />
          <input type="hidden" name="backgroundFocalY" value={focalY} readOnly />
          <input type="hidden" name="backgroundZoom" value={zoom} readOnly />
          <input type="hidden" name="bannerImageUrl" value={bannerImageUrl} readOnly />
        </>
      )}

      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 ${compact ? "h-20" : "h-32"}`}
      >
        {imageUrl && <div className="absolute inset-0 bg-cover" style={backgroundPictureStyle(imageUrl, focalX, focalY, zoom)} />}
        {videoUrl && (
          <video src={videoUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div
          className="absolute inset-0"
          style={isGradient ? { background: `linear-gradient(135deg, ${color}, ${gradientEnd})`, opacity } : { backgroundColor: color, opacity }}
        />
        {bannerImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImageUrl} alt="" className="relative max-h-20 max-w-[60%] object-contain" />
        ) : (
          <span className="relative text-sm font-medium text-white">Vista previa</span>
        )}
      </div>

      {compact && (
        <div className="flex gap-1 rounded-md bg-slate-100 p-1 text-sm dark:bg-slate-800">
          {(
            [
              { key: "color" as const, label: "Color" },
              { key: "image" as const, label: "Imagen" },
              { key: "video" as const, label: "Video" },
            ]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded px-3 py-1.5 font-medium ${
                tab === t.key
                  ? "bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-sky-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Color + opacity: not gated by `tab` when not compact (page background has no tabs, this is its only control besides the image picker below) -- gated to the Color tab only in compact/section mode. */}
      {(!compact || tab === "color") && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{isGradient ? "Color inicial" : "Color de superposición"}</label>
              <input type="color" value={color} onChange={(e) => set({ color: e.target.value })} className="mt-1 h-9 w-16" />
            </div>
            {isGradient && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Color final</label>
                <input type="color" value={gradientEnd} onChange={(e) => set({ gradientEnd: e.target.value })} className="mt-1 h-9 w-16" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Transparencia ({Math.round(opacity * 100)}%)</label>
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
          </div>
          {/* Degradado (gradient) -- only meaningful for a section's own background, matches the client's reference screenshot ("Selector de color" with a two-stop gradient bar). */}
          {compact && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isGradient}
                onChange={(e) => set({ gradientEnd: e.target.checked ? "#8DD1CA" : "" })}
              />
              Degradado (dos colores)
            </label>
          )}
        </div>
      )}

      {(!compact || tab === "image") && (
        <div className="space-y-2">
          {imageUrl && (
            <BackgroundPositioner url={imageUrl} focalX={focalX} focalY={focalY} zoom={zoom} onChange={(p) => set(p)} />
          )}
          {imageUrl && (
            <button type="button" onClick={() => set({ imageUrl: "" })} className="block text-sm text-red-600 hover:underline dark:text-red-400">
              Quitar imagen de fondo
            </button>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {pickerOpen ? "Cerrar biblioteca" : "Elegir imagen de fondo"}
          </button>
          {pickerOpen && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <MediaUploadForm onUploaded={(m) => pickImage(m.url)} />
              <div className="mt-3">
                <MediaGrid items={IMAGE_ITEMS(mediaLibrary)} onSelect={(m) => pickImage(m.url)} />
              </div>
            </div>
          )}
        </div>
      )}

      {compact && tab === "video" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Video corto en bucle (MP4/WebM, máx. 25MB) -- se reproduce silenciado automáticamente.</p>
          {videoUrl && (
            <button type="button" onClick={() => set({ videoUrl: "" })} className="block text-sm text-red-600 hover:underline dark:text-red-400">
              Quitar video de fondo
            </button>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {pickerOpen ? "Cerrar biblioteca" : "Elegir video de fondo"}
          </button>
          {pickerOpen && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <MediaUploadForm onUploaded={(m) => pickVideo(m.url)} accept="video/mp4,video/webm" label="Subir video" />
              <div className="mt-3">
                <MediaGrid items={VIDEO_ITEMS(mediaLibrary)} onSelect={(m) => pickVideo(m.url)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/*
        A real image (logo, hero photo) placed IN the banner, on top of the
        cover background above -- not the same thing as it. "no veo como
        ahora tirarle una imagen arriba como el logo que quiero que salga
        ahí arriba". Page-level only (uncontrolled mode); a section
        background has no title/banner to put this in front of.
      */}
      {!controlled && (
        <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Imagen del encabezado (logo u otra imagen, opcional)</p>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Se muestra sobre el fondo, junto al título de la página.</p>
          {bannerImageUrl && (
            <button type="button" onClick={() => setBannerImageUrl("")} className="mb-2 block text-sm text-red-600 hover:underline dark:text-red-400">
              Quitar imagen del encabezado
            </button>
          )}
          <button
            type="button"
            onClick={() => setBannerPickerOpen((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {bannerPickerOpen ? "Cerrar biblioteca" : "Elegir imagen del encabezado"}
          </button>
          {bannerPickerOpen && (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <MediaUploadForm onUploaded={(m) => { setBannerImageUrl(m.url); setBannerPickerOpen(false); }} />
              <div className="mt-3">
                <MediaGrid items={IMAGE_ITEMS(mediaLibrary)} onSelect={(m) => { setBannerImageUrl(m.url); setBannerPickerOpen(false); }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pan + zoom the background picture: drag it with the mouse or a finger to choose what shows, or use
 * the sliders (keyboard friendly). It is drawn with the same CSS as the page (backgroundPictureStyle).
 * Only a wide strip is shown; the real section/banner has other proportions, so the focal point is
 * what is guaranteed to stay in view.
 */
function BackgroundPositioner({
  url,
  focalX,
  focalY,
  zoom,
  onChange,
}: {
  url: string;
  focalX: number;
  focalY: number;
  zoom: number;
  onChange: (p: { focalX?: number; focalY?: number; zoom?: number }) => void;
}) {
  const uid = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const label = "block text-xs font-medium text-slate-700 dark:text-slate-300";
  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        role="img"
        aria-label="Imagen de fondo: arrástrala para elegir qué parte se ve"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current || !boxRef.current) return;
          const r = boxRef.current.getBoundingClientRect();
          // Dragging moves the picture itself; the focal point moves the opposite way (and a zoomed picture needs a smaller step).
          onChange({ focalX: clamp(focalX - (e.movementX / r.width / zoom) * 100), focalY: clamp(focalY - (e.movementY / r.height / zoom) * 100) });
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => { dragging.current = false; }}
        className="relative aspect-[3/1] w-full cursor-move touch-none select-none overflow-hidden rounded-md border border-slate-300 dark:border-slate-600"
      >
        <div className="absolute inset-0 bg-cover" style={backgroundPictureStyle(url, focalX, focalY, zoom)} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600 dark:text-slate-400">Arrastra la imagen para elegir qué parte se ve, o usa los controles.</p>
        <button type="button" onClick={() => onChange({ focalX: 50, focalY: 50, zoom: 1 })} className="shrink-0 text-xs text-violet-700 underline dark:text-sky-400">
          Centrar
        </button>
      </div>
      <div className="grid max-w-md gap-3 sm:grid-cols-3">
        <label className={label} htmlFor={`${uid}-z`}>
          Zoom ({zoom.toFixed(1)}x)
          <input id={`${uid}-z`} type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => onChange({ zoom: Number(e.target.value) })} className="mt-1 w-full" />
        </label>
        <label className={label} htmlFor={`${uid}-x`}>
          Horizontal ({Math.round(focalX)}%)
          <input id={`${uid}-x`} type="range" min={0} max={100} step={1} value={focalX} onChange={(e) => onChange({ focalX: Number(e.target.value) })} className="mt-1 w-full" />
        </label>
        <label className={label} htmlFor={`${uid}-y`}>
          Vertical ({Math.round(focalY)}%)
          <input id={`${uid}-y`} type="range" min={0} max={100} step={1} value={focalY} onChange={(e) => onChange({ focalY: Number(e.target.value) })} className="mt-1 w-full" />
        </label>
      </div>
    </div>
  );
}
