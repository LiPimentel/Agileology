import { z } from "zod";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";

export const textBlockSchema = z.object({ html: z.string() });
export const imageBlockSchema = z.object({
  url: z.string(),
  altText: z.string(),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  // .default("none") means blocks saved before this field existed parse
  // fine and just render as before (a plain rectangle).
  shape: z.enum(["none", "rounded", "circle", "oval"]).default("none"),
  // Manual pan/zoom of the image within its shape frame (circle/oval only
  // -- see CROPPABLE_SHAPES). focalX/focalY are the CSS object-position
  // percentages (50/50 = centered, the old fixed behavior); zoom is a
  // scale factor applied on top. Defaults reproduce the pre-existing
  // centered/uncropped-zoom look, so old blocks parse unchanged.
  focalX: z.number().min(0).max(100).default(50),
  focalY: z.number().min(0).max(100).default(50),
  zoom: z.number().min(1).max(3).default(1),
  // Percentage of the column's width -- same "Tamaño" control video blocks
  // already have (see videoBlockSchema below). Previously there was no way
  // to shrink the shape itself, only zoom/crop the photo inside it.
  width: z.number().min(20).max(100).default(100),
});
export const linkBlockSchema = z.object({
  label: z.string(),
  href: z.string(),
  internal: z.boolean(),
  newTab: z.boolean(),
});
export const videoBlockSchema = z.object({
  url: z.string(),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  // Same shape vocabulary as images (see imageShape.ts) -- circle/oval crop
  // the embed's iframe container into that frame. There's no pan/zoom for
  // video the way images have it: an embedded YouTube/Vimeo iframe doesn't
  // expose its internal video position to reposition (cross-origin), only
  // the container it sits in can be shaped/sized.
  shape: z.enum(["none", "rounded", "circle", "oval"]).default("none"),
  // Percentage of the column's width -- lets a video be shown smaller than
  // full width, matching the client's ask for an "ajustable size" video
  // component.
  width: z.number().min(20).max(100).default(100),
});
// Map/contact form used to be page-level singletons (a fixed "Componentes
// de contacto" section shown on every page's editor, with no way to place
// them at a specific spot or leave them off most pages). They're now real
// blocks like any other -- addable to any page section, editable inline,
// and only present where an admin actually adds one ("este componente de
// mapa no tiene que salir en todas partes"). Pages only (see
// SectionBlockEditor), not blog posts.
export const mapBlockSchema = z.object({ address: z.string() });
export const contactFormBlockSchema = z.object({
  enabledFields: z.array(z.enum(["name", "email", "message"])).default(["name", "email", "message"]),
});

export type EditorBlock =
  | { id: string; type: "text"; content: z.infer<typeof textBlockSchema> }
  | { id: string; type: "image"; content: z.infer<typeof imageBlockSchema> }
  | { id: string; type: "link"; content: z.infer<typeof linkBlockSchema> }
  | { id: string; type: "video"; content: z.infer<typeof videoBlockSchema> }
  | { id: string; type: "map"; content: z.infer<typeof mapBlockSchema> }
  | { id: string; type: "contactForm"; content: z.infer<typeof contactFormBlockSchema> };

/** Sanitizes a block's content before it's persisted (RS-06). */
export function sanitizeBlockContent(type: string, content: unknown) {
  switch (type) {
    case "text": {
      const parsed = textBlockSchema.parse(content);
      return { html: sanitizeRichText(parsed.html) };
    }
    case "image": {
      const parsed = imageBlockSchema.parse(content);
      return { ...parsed, altText: sanitizePlainText(parsed.altText) };
    }
    case "link": {
      const parsed = linkBlockSchema.parse(content);
      return { ...parsed, label: sanitizePlainText(parsed.label) };
    }
    case "video": {
      const parsed = videoBlockSchema.parse(content);
      return parsed;
    }
    case "map": {
      const parsed = mapBlockSchema.parse(content);
      return { address: sanitizePlainText(parsed.address) };
    }
    case "contactForm": {
      const parsed = contactFormBlockSchema.parse(content);
      return parsed;
    }
    default:
      throw new Error(`Unknown block type: ${type}`);
  }
}
