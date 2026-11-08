import Image from "next/image";
import { Carousel, type CarouselValue } from "@/components/blocks/Carousel";
import { LatestPosts, type LatestPostsValue } from "@/components/blocks/LatestPosts";
import { isUploadedVideo, parseVideoEmbed } from "@/lib/video";
import { TrackedLink } from "@/components/public/TrackedLink";
import {
  IMAGE_SHAPE_WRAPPER_CLASS,
  IMAGE_SHAPE_IMG_CLASS,
  VIDEO_SHAPE_WRAPPER_CLASS,
  FRAMED_IMG_CLASS,
  framedImageStyle,
  framedWrapperClass,
  isFramedImage,
  imageMaxWidthClass,
  ALIGN_CLASS,
  type ImageFrameOrFill,
  type ImageShape,
} from "@/lib/imageShape";
import { MapEmbed } from "@/components/public/MapEmbed";
import { ContactForm } from "@/components/public/ContactForm";
import { CustomFormRenderer, type PublicFormField } from "@/components/public/CustomFormRenderer";

export type RenderableBlock = {
  id?: string;
  type: "text" | "image" | "link" | "video" | "map" | "contactForm" | "customForm" | "carousel" | "latestPosts";
  content: Record<string, unknown>;
  // Section/column layout (pages only -- see PageRenderer, which groups
  // blocks sharing the same `position` into one row and lays them out
  // side by side by `columnIndex`/`columnWidth`). Optional and unused by
  // this component itself, and absent entirely on blog posts and on
  // snapshots published before sections existed.
  position?: number;
  columnIndex?: number;
  columnWidth?: number;
  blockOrder?: number;
  sectionBgImageUrl?: string | null;
  sectionBgColor?: string;
  sectionBgOpacity?: number;
  sectionBgVideoUrl?: string | null;
  sectionBgGradientEnd?: string | null;
  sectionBgFocalX?: number;
  sectionBgFocalY?: number;
  sectionBgZoom?: number;
  // Free-position ("Wix-style") layout, opt-in per section -- see the
  // comment on sections.ts's EditorSection.layoutMode. sectionLayoutMode
  // "free" means PageRenderer positions this block itself via free*
  // instead of grouping it into columns.
  sectionLayoutMode?: string;
  sectionFreeHeight?: number;
  freeX?: number;
  freeY?: number;
  freeWidth?: number;
  freeHeight?: number;
  freeZIndex?: number;
};

export function BlockRenderer({ block, pageId }: { block: RenderableBlock; pageId?: string }) {
  switch (block.type) {
    case "text": {
      const html = String(block.content.html ?? "");
      return (
        <div
          className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-[#3A3F7A]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case "image": {
      const url = String(block.content.url ?? "");
      const altText = String(block.content.altText ?? "");
      const alignment = String(block.content.alignment ?? "center");
      const shape = (block.content.shape as ImageShape | undefined) ?? "none";
      const frame = (block.content.frame as ImageFrameOrFill | undefined) ?? "auto";
      const focalX = Number(block.content.focalX ?? 50);
      const focalY = Number(block.content.focalY ?? 50);
      const zoom = Number(block.content.zoom ?? 1);
      const width = Number(block.content.width ?? 100);
      if (!url) return null;
      // circle/oval default to a smaller max-width -- a full-2xl-wide
      // circle reads as oversized; none/rounded keep the original rectangle
      // sizing unchanged. The "Tamaño" slider (width%) then scales down
      // from there, same pattern video blocks already use.
      const maxWidth = imageMaxWidthClass(shape);
      // Through a window (circle/oval, or a chosen "Marco", or the box of a free section): the
      // picture fills it and can be panned/zoomed. Otherwise the whole picture, as before.
      const framed = isFramedImage(shape, frame);
      const img = (
        <Image
          src={url}
          alt={altText}
          width={1200}
          height={800}
          className={framed ? FRAMED_IMG_CLASS : IMAGE_SHAPE_IMG_CLASS[shape]}
          // Anchor the zoom on the focal point, matching the admin editor's adjuster -- keeps the
          // public render pixel-identical to what was previewed while editing.
          style={framed ? framedImageStyle(focalX, focalY, zoom) : undefined}
        />
      );
      const wrapperClass = framed ? framedWrapperClass(shape, frame) : IMAGE_SHAPE_WRAPPER_CLASS[shape];
      return (
        <div className={`${maxWidth} ${ALIGN_CLASS[alignment] ?? "mx-auto"}`} style={{ width: `${width}%` }}>
          {wrapperClass ? <div className={wrapperClass}>{img}</div> : img}
        </div>
      );
    }
    case "link": {
      const href = String(block.content.href ?? "");
      const label = String(block.content.label ?? href);
      const internal = Boolean(block.content.internal);
      const newTab = Boolean(block.content.newTab);
      if (!href) return null;
      const className = "inline-block w-fit self-start rounded-full bg-[#3A3F7A] px-6 py-2 text-white hover:bg-[#1F2A44]";
      return (
        <TrackedLink href={href} label={`cta:${href}`} internal={internal} newTab={newTab} className={className}>
          {label}
        </TrackedLink>
      );
    }
    case "video": {
      const url = String(block.content.url ?? "");
      const alignment = String(block.content.alignment ?? "center");
      const shape = (block.content.shape as ImageShape | undefined) ?? "none";
      const width = Number(block.content.width ?? 100);
      // A video file uploaded to this site: plays with the browser's own controls (pause, volume,
      // full screen). circle/oval crop it to fill the frame; the other shapes show it whole.
      if (isUploadedVideo(url)) {
        const fit = shape === "circle" || shape === "oval" ? "object-cover" : "object-contain bg-black";
        return (
          <div className={`max-w-3xl ${ALIGN_CLASS[alignment] ?? "mx-auto"}`} style={{ width: `${width}%` }}>
            <div className={VIDEO_SHAPE_WRAPPER_CLASS[shape]}>
              <video src={url} controls playsInline preload="metadata" className={`h-full w-full ${fit}`} />
            </div>
          </div>
        );
      }
      const embed = parseVideoEmbed(url);
      if (!embed) return null;
      return (
        <div className={`max-w-3xl ${ALIGN_CLASS[alignment] ?? "mx-auto"}`} style={{ width: `${width}%` }}>
          <div className={VIDEO_SHAPE_WRAPPER_CLASS[shape]}>
            {/* RS-08: sandboxed iframe with restricted permissions for externally-provided embed URLs */}
            <iframe
              src={embed.embedUrl}
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              title="Video embebido"
            />
          </div>
        </div>
      );
    }
    case "carousel": {
      const slides = Array.isArray(block.content.slides) ? (block.content.slides as CarouselValue["slides"]) : [];
      if (slides.length === 0) return null;
      const c = block.content as Partial<CarouselValue>;
      return (
        <Carousel
          value={{
            slides,
            aspect: c.aspect ?? "16/9",
            shape: c.shape ?? "none",
            showArrows: c.showArrows ?? true,
            showDots: c.showDots ?? true,
            autoplay: c.autoplay ?? false,
            intervalSeconds: c.intervalSeconds ?? 6,
            width: c.width ?? 100,
          }}
        />
      );
    }
    case "latestPosts": {
      const posts = block.content.posts;
      // Not resolved (the editor canvas has no database access): show where it will appear.
      if (!Array.isArray(posts)) {
        return (
          <div className="rounded-md border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
            Entradas recientes: aquí rotan automáticamente tus últimas entradas publicadas.
          </div>
        );
      }
      if (posts.length === 0) return null;
      return (
        <LatestPosts
          value={{
            posts: posts as LatestPostsValue["posts"],
            autoplay: block.content.autoplay !== false,
            intervalSeconds: Number(block.content.intervalSeconds ?? 6),
            author: String(block.content.author ?? "Lissette Pimentel Sosa"),
          }}
        />
      );
    }
    case "map": {
      const address = String(block.content.address ?? "");
      if (!address) return null;
      return <MapEmbed address={address} />;
    }
    case "contactForm": {
      // Real, addable block now (was a fixed page-level singleton) -- still
      // needs the page's id for the submission to attribute correctly, so
      // this case is a no-op wherever a caller doesn't have one (e.g. blog
      // posts don't pass pageId, and shouldn't offer this block type).
      if (!pageId) return null;
      const enabledFields = Array.isArray(block.content.enabledFields)
        ? (block.content.enabledFields as string[])
        : ["name", "email", "message"];
      return <ContactForm pageId={pageId} enabledFields={enabledFields} />;
    }
    case "customForm": {
      // One form from the reusable library (see lib/forms.ts) -- like
      // contactForm, this needs the page's id to attribute submissions,
      // and its fields are only present once resolveCustomFormBlocks()
      // has run (public render + admin preview; the editor's own
      // click-to-select canvas shows a static placeholder instead, see
      // CustomFormBlockEditor.tsx's comment).
      if (!pageId) return null;
      const formId = String(block.content.formId ?? "");
      const fields = Array.isArray(block.content.fields) ? (block.content.fields as PublicFormField[]) : [];
      if (!formId || fields.length === 0) return null;
      return (
        <CustomFormRenderer
          pageId={pageId}
          formId={formId}
          fields={fields}
          successMessage={String(block.content.successMessage ?? "Gracias, tu mensaje fue enviado.")}
        />
      );
    }
    default:
      return null;
  }
}
