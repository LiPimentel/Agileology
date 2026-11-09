"use client";

import { useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * A video file uploaded to this site. Optional loop / autoplay / muted / controls. Autoplay is only
 * ever muted and keeps the controls on (so it can be paused), and it never starts by itself for
 * visitors who prefer reduced motion.
 */
export function UploadedVideo({ src, className, loop, autoplay, muted, controls }: { src: string; className?: string; loop?: boolean; autoplay?: boolean; muted?: boolean; controls?: boolean }) {
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED).matches, () => false);
  const auto = Boolean(autoplay) && !reduced;
  return (
    <video
      src={src}
      controls={Boolean(autoplay) || controls !== false}
      playsInline
      preload="metadata"
      loop={Boolean(loop)}
      autoPlay={auto}
      muted={Boolean(autoplay) || Boolean(muted)}
      className={className}
    />
  );
}
