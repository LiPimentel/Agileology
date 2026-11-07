"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Looping, muted video that fills its section. It starts by itself (browsers only allow muted
 * autoplay), so it has a visible pause/play button (WCAG 2.2.2) and does not autoplay for
 * visitors who prefer reduced motion. Must be placed inside a `relative` container.
 */
export function BackgroundVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  // null = follow the visitor's preference; true/false = they pressed the button.
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduced;

  // The server never emits `autoplay`, so a visitor who prefers reduced motion never gets a
  // video that starts before this code runs; play/pause always follows `playing`, also when the
  // preference changes while the page is open.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) void v.play().catch(() => setUserPlaying(false));
    else v.pause();
  }, [playing]);

  function toggle() {
    setUserPlaying(!playing);
  }

  return (
    <>
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar video de fondo" : "Reproducir video de fondo"}
        className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#1F2A44]/85 text-sm text-white hover:bg-[#1F2A44] focus-visible:outline-2 focus-visible:outline-white focus-visible:shadow-[0_0_0_5px_#1F2A44]"
      >
        <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
      </button>
    </>
  );
}
