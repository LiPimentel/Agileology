import { z } from "zod";
import { isSafeHref } from "@/lib/href";
import { isUploadedVideo, parseVideoEmbed } from "@/lib/video";
import { MAX_CAROUSEL_SLIDES } from "@/lib/carousel";
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
  // Fixed-proportion window ("Marco") the picture is cropped to; "auto" = the whole picture, as before.
  frame: z.enum(["auto", "16/9", "4/3", "1/1", "3/4", "21/9"]).default("auto"),
  // Percentage of the column's width -- same "Tamaño" control video blocks
  // already have (see videoBlockSchema below). Previously there was no way
  // to shrink the shape itself, only zoom/crop the photo inside it.
  width: z.number().min(20).max(100).default(100),
  // Effect on mouse-over (public site). Absent in older blocks = none.
  hoverEffect: z.enum(["none", "zoom", "lift", "focus"]).default("none"),
});
export const linkBlockSchema = z.object({
  label: z.string(),
  href: z.string().refine(isSafeHref, "El enlace debe empezar por /, http(s)://, mailto: o tel:."),
  internal: z.boolean(),
  newTab: z.boolean(),
});
export const videoBlockSchema = z.object({
  // A YouTube/Vimeo link, or a video file uploaded to this site. Empty is allowed (a block still
  // being filled in). Anything else is rejected.
  url: z
    .string()
    .max(2048)
    .refine((u) => u.trim() === "" || parseVideoEmbed(u) !== null || isUploadedVideo(u), "El video debe ser un enlace de YouTube o Vimeo, o un archivo subido."),
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
// One form picked from the reusable library (FormDefinition) -- see
// lib/forms.ts. Only the reference is stored on the block; fields
// themselves live on the FormDefinition/FormField rows, edited at
// /admin/forms, not here.
export const customFormBlockSchema = z.object({ formId: z.string() });

// Image/video slideshow. Images are site-relative or http(s) URLs; videos are limited to
// YouTube/Vimeo links (same rule as the video block), so nothing else can be embedded.
export const carouselSlideSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    // Only uploaded files (/uploads/...) or https images; no tabs/newlines, no protocol-relative.
    url: z
      .string()
      .max(2048)
      .refine((u) => /^\/uploads\/[\w./-]+$/.test(u) || /^https:\/\/[^\s]+$/i.test(u), "La imagen debe ser un archivo de la biblioteca o un enlace https."),
    altText: z.string().max(300).default(""),
    // Per-image framing: "cover" fills the frame (cropping), "contain" shows the whole image.
    // focalX/focalY pick which part stays visible, zoom magnifies around that point.
    fit: z.enum(["cover", "contain"]).default("cover"),
    focalX: z.number().min(0).max(100).default(50),
    focalY: z.number().min(0).max(100).default(50),
    zoom: z.number().min(1).max(3).default(1),
  }),
  z.object({
    kind: z.literal("video"),
    url: z.string().max(2048).refine((u) => parseVideoEmbed(u) !== null, "El video debe ser un enlace de YouTube o Vimeo."),
  }),
]);
export const carouselBlockSchema = z.object({
  slides: z.array(carouselSlideSchema).max(MAX_CAROUSEL_SLIDES).default([]),
  aspect: z.enum(["16/9", "4/3", "1/1"]).default("16/9"),
  // Same frames as image blocks: circle / vertical oval force their own proportions.
  shape: z.enum(["none", "rounded", "circle", "oval"]).default("none"),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(true),
  // Off by default; never advances while a video slide is showing.
  autoplay: z.boolean().default(false),
  intervalSeconds: z.number().min(3).max(15).default(6),
  width: z.number().min(20).max(100).default(100),
});

// Most recent published posts, rotating (3 shown at a time). The posts themselves are looked up
// at render time (lib/latestPosts.ts); only the options are stored here.
export const latestPostsBlockSchema = z.object({
  count: z.number().int().min(3).max(6).default(6),
  autoplay: z.boolean().default(true),
  intervalSeconds: z.number().min(3).max(15).default(6),
  author: z.string().max(80).default("Lissette Pimentel Sosa"),
});

// Rotating quotes: a pool of phrases (text + author), 3 shown at a time (fewer on small screens).
export const MAX_QUOTES = 40;
export const quoteSchema = z.object({
  text: z.string().max(300).default(""),
  author: z.string().max(80).default(""),
});
export const quotesBlockSchema = z.object({
  title: z.string().max(80).default(""),
  quotes: z.array(quoteSchema).max(MAX_QUOTES).default([]),
  autoplay: z.boolean().default(true),
  intervalSeconds: z.number().min(3).max(15).default(7),
});

// Compact cards linking to LinkedIn posts, filled in by hand (LinkedIn has no free public feed):
// up to 5, `visible` of them shown at a time and rotating. Links must point at LinkedIn.
export const MAX_LINKEDIN_POSTS = 5;
const linkedinUrl = z
  .string()
  .max(2048)
  .refine((u) => /^https:\/\/(([a-z]{2,3}|www)\.)?linkedin\.com\/[^\s]*$/i.test(u) || /^https:\/\/lnkd\.in\/[^\s]+$/i.test(u), "El enlace debe ser de LinkedIn (https://www.linkedin.com/...).");
export const linkedinPostSchema = z.object({
  url: linkedinUrl,
  text: z.string().max(280).default(""),
  // YYYY-MM-DD or empty.
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "La fecha debe tener el formato AAAA-MM-DD.").default(""),
  // Optional thumbnail: an uploaded file or an https image.
  image: z
    .string()
    .max(2048)
    .refine((u) => u === "" || /^\/uploads\/[\w./-]+$/.test(u) || /^https:\/\/[^\s]+$/i.test(u), "La imagen debe ser un archivo de la biblioteca o un enlace https.")
    .default(""),
});
export const linkedinPostsBlockSchema = z.object({
  title: z.string().max(80).default("Últimas publicaciones en LinkedIn"),
  posts: z.array(linkedinPostSchema).max(MAX_LINKEDIN_POSTS).default([]),
  visible: z.number().int().min(2).max(4).default(4),
  autoplay: z.boolean().default(true),
  intervalSeconds: z.number().min(3).max(15).default(6),
  // Automatic mode: the id of an Elfsight "LinkedIn Feed" widget (the UUID in its embed code). When set,
  // the block shows that widget -- inside an isolated frame, see /embed/linkedin -- instead of the hand-filled cards.
  elfsightId: z.string().regex(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i, "El ID del widget no es válido.").transform((s) => s.toLowerCase()).default(""),
  // Height (px) of that frame.
  height: z.number().int().min(240).max(1400).default(520),
});

export type EditorBlock =
  | { id: string; type: "text"; content: z.infer<typeof textBlockSchema> }
  | { id: string; type: "image"; content: z.infer<typeof imageBlockSchema> }
  | { id: string; type: "link"; content: z.infer<typeof linkBlockSchema> }
  | { id: string; type: "video"; content: z.infer<typeof videoBlockSchema> }
  | { id: string; type: "map"; content: z.infer<typeof mapBlockSchema> }
  | { id: string; type: "contactForm"; content: z.infer<typeof contactFormBlockSchema> }
  | { id: string; type: "customForm"; content: z.infer<typeof customFormBlockSchema> }
  | { id: string; type: "carousel"; content: z.infer<typeof carouselBlockSchema> }
  | { id: string; type: "latestPosts"; content: z.infer<typeof latestPostsBlockSchema> }
  | { id: string; type: "linkedinPosts"; content: z.infer<typeof linkedinPostsBlockSchema> }
  | { id: string; type: "quotes"; content: z.infer<typeof quotesBlockSchema> };

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
    case "customForm": {
      const parsed = customFormBlockSchema.parse(content);
      return parsed;
    }
    case "carousel": {
      const parsed = carouselBlockSchema.parse(content);
      return {
        ...parsed,
        slides: parsed.slides.map((s) => (s.kind === "image" ? { ...s, altText: sanitizePlainText(s.altText) } : s)),
      };
    }
    case "latestPosts": {
      const parsed = latestPostsBlockSchema.parse(content);
      return { ...parsed, author: sanitizePlainText(parsed.author) };
    }
    case "linkedinPosts": {
      const parsed = linkedinPostsBlockSchema.parse(content);
      return {
        ...parsed,
        title: sanitizePlainText(parsed.title),
        posts: parsed.posts.map((p) => ({ ...p, text: sanitizePlainText(p.text) })),
      };
    }
    case "quotes": {
      const parsed = quotesBlockSchema.parse(content);
      return {
        ...parsed,
        title: sanitizePlainText(parsed.title),
        quotes: parsed.quotes
          .map((q) => ({ text: sanitizePlainText(q.text), author: sanitizePlainText(q.author) }))
          .filter((q) => q.text.trim() !== ""),
      };
    }
    default:
      throw new Error(`Unknown block type: ${type}`);
  }
}
