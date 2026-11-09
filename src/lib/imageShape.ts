// Shared between the (client) ImageBlockEditor preview and the (server)
// BlockRenderer public render, so both apply the exact same shape. Plain
// data, no "use client" -- safe to import from either.
import type { CSSProperties } from "react";

export type ImageShape = "none" | "rounded" | "circle" | "oval";

export const IMAGE_SHAPE_LABELS: Record<ImageShape, string> = {
  none: "Ninguna (rectángulo)",
  rounded: "Bordes redondeados",
  circle: "Círculo",
  oval: "Óvalo",
};

// Effect when the pointer passes over a picture (public site). "none" = static, as before.
// Reusable: any block that shows pictures can take the same value and class.
export type ImageHoverEffect = "none" | "zoom" | "lift" | "focus";
export const IMAGE_HOVER_EFFECTS: ImageHoverEffect[] = ["none", "zoom", "lift", "focus"];
export const IMAGE_HOVER_LABELS: Record<ImageHoverEffect, string> = {
  none: "Ninguno",
  zoom: "Acercamiento suave (zoom)",
  lift: "Levantar con sombra",
  focus: "Enfoque (se aclara y se acerca)",
};

// circle/oval force a fixed aspect ratio + crop the image to fill the
// frame. The outer "wrapper" class owns the aspect ratio + overflow
// clipping; the inner "img" class fills that wrapper and is the element
// that actually gets panned/zoomed (see focalX/focalY/zoom below) --
// splitting these in two lets the drag/zoom transform stay clipped to the
// shape instead of spilling out of its rounded corners.
export const IMAGE_SHAPE_WRAPPER_CLASS: Record<ImageShape, string> = {
  none: "",
  rounded: "",
  circle: "aspect-square w-full overflow-hidden rounded-full",
  // Vertical (portrait) oval, not horizontal -- taller than wide, matching
  // the client's reference (a portrait photo in an oval frame).
  oval: "aspect-[3/4] w-full overflow-hidden rounded-full",
};

export const IMAGE_SHAPE_IMG_CLASS: Record<ImageShape, string> = {
  none: "h-auto w-full rounded-md",
  rounded: "h-auto w-full rounded-2xl",
  circle: "h-full w-full object-cover",
  oval: "h-full w-full object-cover",
};

// Same shape vocabulary, but for video embeds (VideoBlockEditor /
// BlockRenderer's video case) -- unlike images, "none"/"rounded" still
// need an explicit aspect-video (an iframe has no natural aspect ratio to
// fall back on the way an <img> does).
export const VIDEO_SHAPE_WRAPPER_CLASS: Record<ImageShape, string> = {
  none: "aspect-video w-full overflow-hidden rounded-md",
  rounded: "aspect-video w-full overflow-hidden rounded-2xl",
  circle: "aspect-square w-full overflow-hidden rounded-full",
  oval: "aspect-[3/4] w-full overflow-hidden rounded-full",
};

// Only shapes with a forced aspect ratio actually crop the source image,
// so only these support manual pan (focalX/focalY) + zoom -- "none"/
// "rounded" show the whole image at its natural ratio, nothing to pan.
export const CROPPABLE_SHAPES: ImageShape[] = ["circle", "oval"];

export function isCroppableShape(shape: ImageShape): boolean {
  return CROPPABLE_SHAPES.includes(shape);
}

// Shared by BlockRenderer (public render) and the admin editors' live
// previews (ImageBlockEditor, VideoBlockEditor) -- keeping this in one
// place is what lets the editor preview actually match the published
// look pixel-for-pixel instead of drifting from it over time.
export const ALIGN_CLASS: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

/** circle/oval read as oversized at a full 2xl width; none/rounded keep the wider default. */
export function imageMaxWidthClass(shape: ImageShape): string {
  return shape === "circle" || shape === "oval" ? "max-w-xs" : "max-w-2xl";
}

// ── Picture frame ("Marco") ─────────────────────────────────────────────────────────────────
// A fixed-proportion window the picture is cropped to; inside it the picture can be dragged and
// zoomed to choose what shows ("si una imagen es demasiado grande, poder arrastrarla hasta que
// se vea lo que me interesa"). "auto" = no window: the whole picture at its own proportions
// (how every picture saved before this existed behaves). circle/oval already are a window, with
// the proportions of their shape.
export type ImageFrame = "auto" | "16/9" | "4/3" | "1/1" | "3/4" | "21/9";
export const IMAGE_FRAMES: ImageFrame[] = ["auto", "16/9", "4/3", "1/1", "3/4", "21/9"];
export const IMAGE_FRAME_LABELS: Record<ImageFrame, string> = {
  auto: "Libre (la imagen completa)",
  "16/9": "Panorámico (16:9)",
  "4/3": "Clásico (4:3)",
  "1/1": "Cuadrado (1:1)",
  "3/4": "Vertical (3:4)",
  "21/9": "Cinta (21:9)",
};
const FRAME_ASPECT_CLASS: Record<Exclude<ImageFrame, "auto">, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
  "21/9": "aspect-[21/9]",
};

/** "fill" is internal: a free-layout box already defines the window, the picture just fills it. */
export type ImageFrameOrFill = ImageFrame | "fill";

/** Is the picture shown through a window (so it can be dragged/zoomed)? */
export function isFramedImage(shape: ImageShape, frame: ImageFrameOrFill | undefined): boolean {
  return isCroppableShape(shape) || (frame !== undefined && frame !== "auto");
}

export function framedWrapperClass(shape: ImageShape, frame: ImageFrameOrFill | undefined): string {
  if (isCroppableShape(shape)) return IMAGE_SHAPE_WRAPPER_CLASS[shape];
  const rounding = shape === "rounded" ? "rounded-2xl" : "rounded-md";
  if (frame === "fill") return `h-full w-full overflow-hidden ${rounding}`;
  if (frame && frame !== "auto") return `${FRAME_ASPECT_CLASS[frame]} w-full overflow-hidden ${rounding}`;
  return IMAGE_SHAPE_WRAPPER_CLASS[shape];
}

export const FRAMED_IMG_CLASS = "h-full w-full object-cover";

/** The CSS that pans/zooms the picture inside its window (same maths in the editor preview and on the page). */
export function framedImageStyle(focalX: number, focalY: number, zoom: number): CSSProperties {
  return { objectPosition: `${focalX}% ${focalY}%`, transform: `scale(${zoom})`, transformOrigin: `${focalX}% ${focalY}%` };
}
