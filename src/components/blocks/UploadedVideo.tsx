"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * A video file uploaded to this site. Optional loop / autoplay / muted / controls. Autoplay is only
 * ever muted and keeps the controls on (so it can be paused). It is started from script after the page
 * hydrates (never with the HTML `autoplay` attribute, which would start before we can check the
 * reduced-motion preference), and is stopped if the visitor prefers reduced motion.
 */
export function UploadedVideo({ src, className, loop, autoplay, muted, controls }: { src: string; className?: string; loop?: boolean; autoplay?: boolean; muted?: boolean; controls?: boolean }) {
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED).matches, () => false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || !autoplay) return;
    if (reduced) v.pause();
    else v.play().catch(() => {});
  }, [autoplay, reduced]);
  return (
    <video
      ref={ref}
      src={src}
      controls={Boolean(autoplay) || controls !== false}
      playsInline
      preload="metadata"
      loop={Boolean(loop)}
      muted={Boolean(autoplay) || Boolean(muted)}
      className={className}
    />
  );
}
