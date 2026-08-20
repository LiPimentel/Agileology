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
});
export const linkBlockSchema = z.object({
  label: z.string(),
  href: z.string(),
  internal: z.boolean(),
  newTab: z.boolean(),
});
export const videoBlockSchema = z.object({ url: z.string() });

export type EditorBlock =
  | { id: string; type: "text"; content: z.infer<typeof textBlockSchema> }
  | { id: string; type: "image"; content: z.infer<typeof imageBlockSchema> }
  | { id: string; type: "link"; content: z.infer<typeof linkBlockSchema> }
  | { id: string; type: "video"; content: z.infer<typeof videoBlockSchema> };

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
    default:
      throw new Error(`Unknown block type: ${type}`);
  }
}
