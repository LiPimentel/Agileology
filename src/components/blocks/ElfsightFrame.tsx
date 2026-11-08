"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The LinkedIn feed widget, shown in a frame served from its own origin (see /embed/linkedin). The frame
 * starts at `initialHeight` and then grows or shrinks to whatever the widget reports, so every post
 * shows. Only a height sent by that exact origin AND that exact frame is accepted.
 */
export function ElfsightFrame({ src, embedOrigin, initialHeight, title }: { src: string; embedOrigin: string; initialHeight: number; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== embedOrigin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: unknown; height?: unknown } | null;
      if (!d || d.type !== "agileology-embed-height" || typeof d.height !== "number" || !Number.isFinite(d.height)) return;
      setHeight(Math.min(4000, Math.max(200, Math.ceil(d.height))));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [embedOrigin]);

  return (
    <iframe
      ref={frame}
      src={src}
      title={title}
      loading="lazy"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="w-full rounded-md border-0"
      style={{ height: `${height}px` }}
    />
  );
}
