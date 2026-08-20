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

// Only shapes with a forced aspect ratio actually crop the source image,
// so only these support manual pan (focalX/focalY) + zoom -- "none"/
// "rounded" show the whole image at its natural ratio, nothing to pan.
export const CROPPABLE_SHAPES: ImageShape[] = ["circle", "oval"];

export function isCroppableShape(shape: ImageShape): boolean {
  return CROPPABLE_SHAPES.includes(shape);
}
