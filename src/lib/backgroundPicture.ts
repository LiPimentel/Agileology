import type { CSSProperties } from "react";

/** Keeps a focal point / zoom inside the range the editor can produce (anything else = centred, no zoom). */
export function sanitizeFocal(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50;
}
export function sanitizeZoom(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(3, Math.max(1, v)) : 1;
}

/**
 * The CSS for a picture used as a background: it covers the box, `focal` picks which part of it
 * shows (the same % the editor's drag produces) and `zoom` magnifies around that point. Shared by the
 * public page, the editor's live preview and the picker, so all three show the same crop.
 */
export function backgroundPictureStyle(url: string, focalX?: number | null, focalY?: number | null, zoom?: number | null): CSSProperties {
  const x = sanitizeFocal(focalX);
  const y = sanitizeFocal(focalY);
  const z = sanitizeZoom(zoom);
  return {
    backgroundImage: `url("${url.replace(/["\\\n\r]/g, "")}")`,
    backgroundPosition: `${x}% ${y}%`,
    transform: z === 1 ? undefined : `scale(${z})`,
    transformOrigin: `${x}% ${y}%`,
  };
}
