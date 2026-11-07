"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { parseVideoEmbed } from "@/lib/video";

export type CarouselSlide = { kind: "image"; url: string; altText?: string } | { kind: "video"; url: string };
export type CarouselValue = {
  slides: CarouselSlide[];
  aspect: "16/9" | "4/3" | "1/1";
  showArrows: boolean;
  showDots: boolean;
  autoplay: boolean;
  intervalSeconds: number;
  width: number;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const ASPECT_CLASS: Record<CarouselValue["aspect"], string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
};

/**
 * Image/video slideshow. Accessible by design: a labelled group, previous/next and dot
 * buttons, Left/Right arrow keys, swipe on touch screens. Autoplay is opt-in, pauses on
 * hover/focus and with a visible pause button, is off when the visitor prefers reduced
 * motion, and never advances while a video is showing. Only the current slide is mounted, so
 * video iframes load on demand.
 */
export function Carousel({ value }: { value: CarouselValue }) {
  const slides = value.slides ?? [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const touchX = useRef<number | null>(null);

  const count = slides.length;
  const current = Math.min(index, Math.max(count - 1, 0));
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  const slide = slides[current];
  const autoplaying = value.autoplay && count > 1 && !paused && !hovered && !reducedMotion && slide?.kind === "image";
  useEffect(() => {
    if (!autoplaying) return;
    const t = window.setTimeout(() => go(current + 1), Math.max(3, value.intervalSeconds) * 1000);
    return () => window.clearTimeout(t);
  }, [autoplaying, current, go, value.intervalSeconds]);

  if (count === 0 || !slide) return null;

  const btn =
    "flex h-10 w-10 items-center justify-center rounded-full bg-[#1F2A44]/80 text-white hover:bg-[#1F2A44] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      role="group"
      aria-roledescription="carrusel"
      aria-label="Carrusel de imágenes y videos"
      tabIndex={0}
      className="relative mx-auto w-full overflow-hidden rounded-md bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A3F7A]"
      style={{ maxWidth: `${value.width}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(current - 1);
        if (e.key === "ArrowRight") go(current + 1);
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
      <div
        role="group"
        aria-roledescription="diapositiva"
        aria-label={`${current + 1} de ${count}`}
        aria-live={autoplaying ? "off" : "polite"}
        className={`relative w-full ${ASPECT_CLASS[value.aspect] ?? "aspect-video"}`}
      >
        {slide.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.url} alt={slide.altText ?? ""} className="h-full w-full object-cover" loading={current === 0 ? "eager" : "lazy"} />
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

      {count > 1 && value.showArrows && (
        <>
          <button type="button" aria-label="Diapositiva anterior" className={`${btn} absolute left-2 top-1/2 -translate-y-1/2`} onClick={() => go(current - 1)}>
            <span aria-hidden="true">‹</span>
          </button>
          <button type="button" aria-label="Diapositiva siguiente" className={`${btn} absolute right-2 top-1/2 -translate-y-1/2`} onClick={() => go(current + 1)}>
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}

      {count > 1 && (value.showDots || value.autoplay) && (
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
          {value.autoplay && (
            <button type="button" aria-label={paused ? "Reanudar avance automático" : "Pausar avance automático"} className={`${btn} h-8 w-8 text-xs`} onClick={() => setPaused((p) => !p)}>
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
                className={`h-3 w-3 rounded-full border border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${i === current ? "bg-white" : "bg-[#1F2A44]/70"}`}
              />
            ))}
        </div>
      )}
    </div>
  );
}
