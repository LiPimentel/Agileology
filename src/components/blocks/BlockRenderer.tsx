import Link from "next/link";
import Image from "next/image";
import { parseVideoEmbed } from "@/lib/video";
import { IMAGE_SHAPE_WRAPPER_CLASS, IMAGE_SHAPE_IMG_CLASS, VIDEO_SHAPE_WRAPPER_CLASS, isCroppableShape, type ImageShape } from "@/lib/imageShape";
import { MapEmbed } from "@/components/public/MapEmbed";
import { ContactForm } from "@/components/public/ContactForm";

export type RenderableBlock = {
  id?: string;
  type: "text" | "image" | "link" | "video" | "map" | "contactForm";
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
};

const ALIGN_CLASS: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

export function BlockRenderer({ block, pageId }: { block: RenderableBlock; pageId?: string }) {
  switch (block.type) {
    case "text": {
      const html = String(block.content.html ?? "");
      return (
        <div
          className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-violet-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case "image": {
      const url = String(block.content.url ?? "");
      const altText = String(block.content.altText ?? "");
      const alignment = String(block.content.alignment ?? "center");
      const shape = (block.content.shape as ImageShape | undefined) ?? "none";
      const focalX = Number(block.content.focalX ?? 50);
      const focalY = Number(block.content.focalY ?? 50);
      const zoom = Number(block.content.zoom ?? 1);
      const width = Number(block.content.width ?? 100);
      if (!url) return null;
      // circle/oval default to a smaller max-width -- a full-2xl-wide
      // circle reads as oversized; none/rounded keep the original rectangle
      // sizing unchanged. The "Tamaño" slider (width%) then scales down
      // from there, same pattern video blocks already use.
      const maxWidth = shape === "circle" || shape === "oval" ? "max-w-xs" : "max-w-2xl";
      const croppable = isCroppableShape(shape);
      const img = (
        <Image
          src={url}
          alt={altText}
          width={1200}
          height={800}
          className={IMAGE_SHAPE_IMG_CLASS[shape]}
          style={
            croppable
              ? {
                  objectPosition: `${focalX}% ${focalY}%`,
                  transform: `scale(${zoom})`,
                  // Anchor zoom on the focal point, matching the admin
                  // editor's ImageShapeAdjuster -- keeps the public render
                  // pixel-identical to what was previewed while editing.
                  transformOrigin: `${focalX}% ${focalY}%`,
                }
              : undefined
          }
        />
      );
      return (
        <div className={`${maxWidth} ${ALIGN_CLASS[alignment] ?? "mx-auto"}`} style={{ width: `${width}%` }}>
          {IMAGE_SHAPE_WRAPPER_CLASS[shape] ? <div className={IMAGE_SHAPE_WRAPPER_CLASS[shape]}>{img}</div> : img}
        </div>
      );
    }
    case "link": {
      const href = String(block.content.href ?? "");
      const label = String(block.content.label ?? href);
      const internal = Boolean(block.content.internal);
      const newTab = Boolean(block.content.newTab);
      if (!href) return null;
      const className = "inline-block rounded-md bg-violet-700 px-5 py-2 text-white hover:bg-violet-800";
      if (internal) {
        return (
          <Link href={href} className={className} target={newTab ? "_blank" : undefined}>
            {label}
          </Link>
        );
      }
      return (
        <a href={href} className={className} target={newTab ? "_blank" : undefined} rel="noopener noreferrer">
          {label}
        </a>
      );
    }
    case "video": {
      const url = String(block.content.url ?? "");
      const embed = parseVideoEmbed(url);
      if (!embed) return null;
      const alignment = String(block.content.alignment ?? "center");
      const shape = (block.content.shape as ImageShape | undefined) ?? "none";
      const width = Number(block.content.width ?? 100);
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
    default:
      return null;
  }
}
