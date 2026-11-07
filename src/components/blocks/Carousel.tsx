"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { parseVideoEmbed } from "@/lib/video";
import { IMAGE_SHAPE_WRAPPER_CLASS, type ImageShape } from "@/lib/imageShape";

export type CarouselImageSlide = {
  kind: "image";
  url: string;
  altText?: string;
  fit?: "cover" | "contain";
  focalX?: number;
  focalY?: number;
  zoom?: number;
};
export type CarouselSlide = CarouselImageSlide | { kind: "video"; url: string };
export type CarouselValue = {
  slides: CarouselSlide[];
  aspect: "16/9" | "4/3" | "1/1";
  shape?: ImageShape;
  showArrows: boolean;
  showDots: boolean;
  autoplay: boolean;
  intervalSeconds: number;
  width: number;
};

const ASPECT_CLASS: Record<CarouselValue["aspect"], string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
};

/** Frame classes: circle/oval carry their own proportions; the rest follow the chosen aspect. */
export function carouselFrameClass(shape: ImageShape | undefined, aspect: CarouselValue["aspect"]): string {
  const s = shape ?? "none";
  if (s === "circle" || s === "oval") return IMAGE_SHAPE_WRAPPER_CLASS[s];
  return `w-full overflow-hidden ${ASPECT_CLASS[aspect] ?? "aspect-video"} ${s === "rounded" ? "rounded-2xl" : "rounded-md"}`;
}
export function isRoundShape(shape: ImageShape | undefined) {
  return shape === "circle" || shape === "oval";
}
/** Style that frames an image slide inside its frame (same maths as the editor preview). */
export function slideImageStyle(s: CarouselImageSlide): React.CSSProperties {
  const fx = s.focalX ?? 50;
  const fy = s.focalY ?? 50;
  return {
    objectFit: s.fit === "contain" ? "contain" : "cover",
    objectPosition: `${fx}% ${fy}%`,
    transform: `scale(${s.zoom ?? 1})`,
    transformOrigin: `${fx}% ${fy}%`,
  };
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

// White ring + dark ring outside it, so focus stays visible over any photo (light or dark).
const FOCUS = "focus-visible:outline-2 focus-visible:outline-white focus-visible:shadow-[0_0_0_5px_#1F2A44]";

/**
 * Image/video slideshow. Accessible by design: a labelled group, previous/next and dot
 * buttons (at least one of the two kinds is always shown so every slide is reachable),
 * Left/Right arrow keys, swipe on touch screens, and a polite status announcement of the
 * current position. Autoplay is opt-in, pauses on mouse hover, on keyboard focus and with a
 * visible pause button, is off when the visitor prefers reduced motion, and never advances
 * while a video is showing. Only the current slide is mounted, so video iframes load on demand.
 */
export function Carousel({ value }: { value: CarouselValue }) {
  const slides = value.slides ?? [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const touchX = useRef<number | null>(null);

  const count = slides.length;
  const current = Math.min(index, Math.max(count - 1, 0));
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  const slide = slides[current];
  const round = isRoundShape(value.shape);
  const autoplaying = value.autoplay && count > 1 && !paused && !hovered && !focused && !reducedMotion && slide?.kind === "image";
  useEffect(() => {
    if (!autoplaying) return;
    const t = window.setTimeout(() => go(current + 1), Math.max(3, value.intervalSeconds) * 1000);
    return () => window.clearTimeout(t);
  }, [autoplaying, current, go, value.intervalSeconds]);

  if (count === 0 || !slide) return null;

  // Never leave a multi-slide carousel without a visible way to move between slides.
  const showArrows = value.showArrows || !value.showDots;
  const arrow = `flex h-10 w-10 items-center justify-center rounded-full bg-[#1F2A44]/85 text-white hover:bg-[#1F2A44] ${FOCUS}`;
  const position = `Diapositiva ${current + 1} de ${count}${slide.kind === "image" && slide.altText ? `: ${slide.altText}` : slide.kind === "video" ? ": video" : ""}`;

  return (
    <div
      role="group"
      aria-roledescription="carrusel"
      aria-label="Carrusel de imágenes y videos. Usa las flechas izquierda y derecha para cambiar de diapositiva."
      tabIndex={0}
      className={`relative mx-auto ${round ? "max-w-xs" : "w-full"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A3F7A] ${round ? "rounded-[2rem]" : "rounded-md"}`}
      style={round ? { width: `${value.width}%` } : { maxWidth: `${value.width}%` }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || count < 2) return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(current - 1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(current + 1);
        }
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start == null || end == null || Math.abs(end - start) < 50) return;
        go(end < start ? current + 1 : current - 1);
      }}
    >
      <p role="status" className="sr-only">
        {position}
      </p>
      <div role="group" aria-roledescription="diapositiva" aria-label={`${current + 1} de ${count}`} className={`relative bg-slate-100 ${carouselFrameClass(value.shape, value.aspect)}`}>
        {slide.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.url} alt={slide.altText ?? ""} className="h-full w-full" style={slideImageStyle(slide)} loading={current === 0 ? "eager" : "lazy"} />
        ) : (
          (() => {
            const embed = parseVideoEmbed(slide.url);
            if (!embed) return null;
            return (
              <iframe
                src={embed.embedUrl}
                className="h-full w-full"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allow="encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                title={`Video ${current + 1} de ${count}`}
              />
            );
          })()
        )}
      </div>

      {count > 1 && showArrows && (
        <>
          <button type="button" aria-label="Diapositiva anterior" className={`${arrow} absolute left-2 top-1/2 -translate-y-1/2`} onClick={() => go(current - 1)}>
            <span aria-hidden="true">‹</span>
          </button>
          <button type="button" aria-label="Diapositiva siguiente" className={`${arrow} absolute right-2 top-1/2 -translate-y-1/2`} onClick={() => go(current + 1)}>
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}

      {count > 1 && (value.showDots || (value.autoplay && !reducedMotion)) && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <div className="flex items-center rounded-full bg-[#1F2A44]/85 px-1">
            {value.autoplay && !reducedMotion && (
              <button
                type="button"
                aria-label={paused ? "Reanudar avance automático" : "Pausar avance automático"}
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs text-white ${FOCUS}`}
                onClick={() => setPaused((p) => !p)}
              >
                <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
              </button>
            )}
            {value.showDots &&
              slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir a la diapositiva ${i + 1} de ${count}`}
                  aria-current={i === current ? "true" : undefined}
                  onClick={() => go(i)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${FOCUS}`}
                >
                  <span className={`block h-3 w-3 rounded-full border border-white ${i === current ? "bg-white" : "bg-transparent"}`} />
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
