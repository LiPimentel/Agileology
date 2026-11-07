"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { Carousel, carouselFrameClass, slideImageStyle, type CarouselImageSlide, type CarouselValue } from "@/components/blocks/Carousel";
import { IMAGE_SHAPE_LABELS, type ImageShape } from "@/lib/imageShape";
import { MAX_CAROUSEL_SLIDES } from "@/lib/carousel";
import { parseVideoEmbed } from "@/lib/video";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { PlayIcon } from "@/components/icons";

export type CarouselBlockValue = CarouselValue;

export const EMPTY_CAROUSEL: CarouselBlockValue = {
  slides: [],
  aspect: "16/9",
  shape: "none",
  showArrows: true,
  showDots: true,
  autoplay: false,
  intervalSeconds: 6,
  width: 100,
};

const field = "rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const small = "rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Framing controls for one image slide, shown inside the same frame (shape + proportion) the
 * carousel uses. You can drag the picture, or use the sliders (keyboard friendly), zoom, and
 * choose between filling the frame (cropping) or showing the whole image.
 */
function SlideAdjuster({
  slide,
  shape,
  aspect,
  uid,
  onChange,
}: {
  slide: CarouselImageSlide;
  shape: ImageShape;
  aspect: CarouselBlockValue["aspect"];
  uid: string;
  onChange: (patch: Partial<CarouselImageSlide>) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const fx = slide.focalX ?? 50;
  const fy = slide.focalY ?? 50;
  const zoom = slide.zoom ?? 1;
  const fit = slide.fit ?? "cover";
  const round = shape === "circle" || shape === "oval";

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    // The zoom magnifies everything after object-position, so divide the drag by it.
    const dx = (e.movementX / rect.width / zoom) * 100;
    const dy = (e.movementY / rect.height / zoom) * 100;
    // Dragging right/down moves the picture itself right/down.
    onChange({ focalX: clamp(fx - dx, 0, 100), focalY: clamp(fy - dy, 0, 100) });
  }
  const sliderRow = "block text-xs font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="w-full space-y-3 rounded-md bg-slate-50 p-3 dark:bg-slate-800">
      <div className={`mx-auto ${round ? "max-w-[14rem]" : "max-w-md"}`}>
        <div
          ref={boxRef}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={onMove}
          onPointerUp={(e) => {
            dragging.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerLeave={() => {
            dragging.current = false;
          }}
          className={`relative cursor-move touch-none border border-slate-300 bg-slate-100 ${carouselFrameClass(shape, aspect)}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.url} alt="" draggable={false} className="h-full w-full select-none" style={slideImageStyle(slide)} />
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Arrastra la imagen dentro del marco, o usa los controles de abajo.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-fit`} className={sliderRow}>Ajuste</label>
          <select
            id={`${uid}-fit`}
            value={fit}
            onChange={(e) => onChange({ fit: e.target.value as "cover" | "contain" })}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="cover">Llenar el marco (recorta)</option>
            <option value="contain">Mostrar completa (puede dejar bordes)</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-zoom`} className={sliderRow}>Zoom ({zoom.toFixed(1)}x)</label>
          <input id={`${uid}-zoom`} type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => onChange({ zoom: Number(e.target.value) })} className="mt-1 w-full" />
        </div>
        <div>
          <label htmlFor={`${uid}-fx`} className={sliderRow}>Posición horizontal ({Math.round(fx)}%)</label>
          <input id={`${uid}-fx`} type="range" min={0} max={100} step={1} value={fx} onChange={(e) => onChange({ focalX: Number(e.target.value) })} className="mt-1 w-full" />
        </div>
        <div>
          <label htmlFor={`${uid}-fy`} className={sliderRow}>Posición vertical ({Math.round(fy)}%)</label>
          <input id={`${uid}-fy`} type="range" min={0} max={100} step={1} value={fy} onChange={(e) => onChange({ focalY: Number(e.target.value) })} className="mt-1 w-full" />
        </div>
      </div>
      <button type="button" onClick={() => onChange({ focalX: 50, focalY: 50, zoom: 1, fit: "cover" })} className="text-xs text-violet-700 underline dark:text-sky-400">
        Restablecer encuadre
      </button>
    </div>
  );
}

export function CarouselBlockEditor({
  value,
  onChange,
  mediaLibrary,
}: {
  value: CarouselBlockValue;
  onChange: (value: CarouselBlockValue) => void;
  mediaLibrary: MediaItem[];
}) {
  const uid = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  // After moving/removing a slide the row's buttons are re-created, so put the focus back
  // explicitly, and announce what happened to screen readers.
  const pendingFocus = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [adjusting, setAdjusting] = useState<number | null>(null);
  useEffect(() => {
    if (!pendingFocus.current) return;
    document.getElementById(`${uid}-${pendingFocus.current}`)?.focus();
    pendingFocus.current = null;
  }, [uid, value.slides]);
  const slides = value.slides ?? [];
  const full = slides.length >= MAX_CAROUSEL_SLIDES;
  const videoOk = videoUrl ? parseVideoEmbed(videoUrl) !== null : true;

  const setSlides = (next: CarouselBlockValue["slides"]) => onChange({ ...value, slides: next });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setAdjusting(null);
    setSlides(next);
    pendingFocus.current = `menu-${j}`;
    setAnnouncement(`Diapositiva movida a la posición ${j + 1} de ${slides.length}.`);
  };
  const removeAt = (i: number) => {
    setAdjusting(null);
    setSlides(slides.filter((_, k) => k !== i));
    setAnnouncement(`Diapositiva ${i + 1} quitada.`);
    pendingFocus.current = slides.length > 1 ? `menu-${Math.min(i, slides.length - 2)}` : "add-image";
  };
  const addImage = (url: string, altText = "") => {
    if (full) return;
    setSlides([...slides, { kind: "image", url, altText }]);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-4">
      {slides.length > 0 && (
        <div className="pointer-events-none" inert>
          {/* Live preview with the same component the public page uses. */}
          <Carousel value={{ ...value, autoplay: false }} />
        </div>
      )}

      <ol className="space-y-2">
        {slides.map((s, i) => (
          <li key={i} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 p-2 dark:border-slate-700">
            <span className="w-6 text-sm text-slate-600 dark:text-slate-400">{i + 1}</span>
            {s.kind === "image" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt="" className="h-12 w-16 rounded object-cover" />
                <input
                  aria-label={`Texto alternativo de la diapositiva ${i + 1}`}
                  placeholder="Descripción de la imagen (para lectores de pantalla)"
                  maxLength={300}
                  value={s.altText ?? ""}
                  onChange={(e) => setSlides(slides.map((x, k) => (k === i && x.kind === "image" ? { ...x, altText: e.target.value } : x)))}
                  className={`${field} min-w-[12rem] flex-1 py-1 text-sm`}
                />
              </>
            ) : (
              <span className="min-w-[12rem] flex-1 truncate text-sm text-slate-700 dark:text-slate-300"><PlayIcon size={14} className="mr-1 inline align-text-bottom" /> Video: {s.url}</span>
            )}
            <div className="flex gap-1">
              {s.kind === "image" && (
                <button
                  type="button"
                  className={small}
                  aria-expanded={adjusting === i}
                  aria-controls={`${uid}-adjust-${i}`}
                  onClick={() => setAdjusting(adjusting === i ? null : i)}
                >
                  {adjusting === i ? "Cerrar ajuste" : "Ajustar"}
                </button>
              )}
              <ActionMenu
                id={`${uid}-menu-${i}`}
                label={`Acciones de la diapositiva ${i + 1}`}
                items={[
                  { label: "Mover arriba", disabled: i === 0, onSelect: () => move(i, -1) },
                  { label: "Mover abajo", disabled: i === slides.length - 1, onSelect: () => move(i, 1) },
                  { label: "Quitar", danger: true, onSelect: () => removeAt(i) },
                ]}
              />
            </div>
            {s.kind === "image" && adjusting === i && (
              <div id={`${uid}-adjust-${i}`} className="w-full">
                <SlideAdjuster
                  slide={s}
                  shape={value.shape ?? "none"}
                  aspect={value.aspect}
                  uid={`${uid}-s${i}`}
                  onChange={(patch) => setSlides(slides.map((x, k) => (k === i && x.kind === "image" ? { ...x, ...patch } : x)))}
                />
              </div>
            )}
            {s.kind === "image" && !s.altText?.trim() && (
              <p className="w-full pl-9 text-xs text-amber-800 dark:text-amber-300">
                Falta la descripción. Añádela para quien usa lector de pantalla; déjala vacía solo si la imagen es decorativa.
              </p>
            )}
          </li>
        ))}
      </ol>
      {slides.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">Aún no hay diapositivas. Añade imágenes o videos.</p>}
      {full && <p className="text-sm text-amber-800 dark:text-amber-300">Máximo {MAX_CAROUSEL_SLIDES} diapositivas.</p>}

      <div className="space-y-3">
        <button type="button" id={`${uid}-add-image`} aria-expanded={pickerOpen} disabled={full} onClick={() => setPickerOpen((v) => !v)} className={small + " px-3 py-1.5 text-sm"}>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor={`${uid}-video-url`}>
              Añadir video (YouTube o Vimeo)
            </label>
            <input
              id={`${uid}-video-url`}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              aria-invalid={!videoOk}
              aria-describedby={!videoOk ? `${uid}-video-error` : undefined}
              className={`${field} mt-1 w-full`}
            />
            {!videoOk && (
              <p id={`${uid}-video-error`} role="alert" className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                No se reconoce como enlace de YouTube o Vimeo.
              </p>
            )}
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
          <label htmlFor={`${uid}-shape`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Forma</label>
          <select id={`${uid}-shape`} value={value.shape ?? "none"} onChange={(e) => {
              const shape = e.target.value as ImageShape;
              // A circle/oval carousel takes the same size as an oval image: 100 % of that frame.
              onChange({ ...value, shape, width: shape === "circle" || shape === "oval" ? 100 : value.width });
            }} className={`${field} mt-1`}>
            {(Object.keys(IMAGE_SHAPE_LABELS) as ImageShape[]).map((k) => (
              <option key={k} value={k}>{IMAGE_SHAPE_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-aspect`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Proporción</label>
          <select id={`${uid}-aspect`} value={value.aspect} onChange={(e) => onChange({ ...value, aspect: e.target.value as CarouselBlockValue["aspect"] })} className={`${field} mt-1`}>
            <option value="16/9">Panorámica (16:9)</option>
            <option value="4/3">Clásica (4:3)</option>
            <option value="1/1">Cuadrada (1:1)</option>
          </select>
          {(value.shape === "circle" || value.shape === "oval") && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">En círculo u óvalo la proporción la fija la forma.</p>
          )}
        </div>
        <div>
          <label htmlFor={`${uid}-width`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tamaño ({value.width}%)</label>
          {(value.shape === "circle" || value.shape === "oval") && (
            <p className="text-xs text-slate-600 dark:text-slate-400">100 % = mismo tamaño que una imagen en óvalo.</p>
          )}
          <input id={`${uid}-width`} type="range" min={20} max={100} step={5} value={value.width} onChange={(e) => onChange({ ...value, width: Number(e.target.value) })} className="mt-3 w-40" />
        </div>
        <label className="mt-7 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.showArrows} disabled={value.showArrows && !value.showDots} onChange={(e) => onChange({ ...value, showArrows: e.target.checked })} /> Flechas
        </label>
        <label className="mt-7 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.showDots} disabled={value.showDots && !value.showArrows} onChange={(e) => onChange({ ...value, showDots: e.target.checked })} /> Puntos
        </label>
        <label className="mt-7 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={value.autoplay} onChange={(e) => onChange({ ...value, autoplay: e.target.checked })} /> Avance automático
        </label>
        {value.autoplay && (
          <div>
            <label htmlFor={`${uid}-interval`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cada {value.intervalSeconds} s</label>
            <input id={`${uid}-interval`} type="range" min={3} max={15} step={1} value={value.intervalSeconds} onChange={(e) => onChange({ ...value, intervalSeconds: Number(e.target.value) })} className="mt-2 w-32" />
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">Siempre debe quedar activa al menos una forma de navegar: flechas o puntos.</p>
      <p role="status" className="sr-only">{announcement}</p>
      {value.autoplay && <p className="text-xs text-slate-600 dark:text-slate-400">Se detiene al pasar el ratón, con el botón de pausa, si el visitante pidió «reducir movimiento», y mientras se muestra un video.</p>}
    </div>
  );
}
