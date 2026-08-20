// Shared between the (client) ImageBlockEditor preview and the (server)
// BlockRenderer public render, so both apply the exact same shape. Plain
// data, no "use client" -- safe to import from either.
export type ImageShape = "none" | "rounded" | "circle" | "oval";

export const IMAGE_SHAPE_LABELS: Record<ImageShape, string> = {
  none: "Ninguna (rectángulo)",
  rounded: "Bordes redondeados",
  circle: "Círculo",
  oval: "Óvalo",
};

// circle/oval force a fixed aspect ratio + object-cover so the image fills
// the shape cleanly regardless of its original proportions (no manual
// crop/resize -- that's the deliberately-scoped-down version of this
// feature; a full drag-to-resize-within-the-shape editor is a separate,
// much bigger undertaking).
export const IMAGE_SHAPE_CLASS: Record<ImageShape, string> = {
  none: "h-auto w-full rounded-md",
  rounded: "h-auto w-full rounded-2xl",
  circle: "aspect-square w-full rounded-full object-cover",
  // Vertical (portrait) oval, not horizontal -- taller than wide, matching
  // the client's reference (a portrait photo in an oval frame).
  oval: "aspect-[3/4] w-full rounded-full object-cover",
};
