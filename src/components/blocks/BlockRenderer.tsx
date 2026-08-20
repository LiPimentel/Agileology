import Link from "next/link";
import Image from "next/image";
import { parseVideoEmbed } from "@/lib/video";
import { IMAGE_SHAPE_CLASS, type ImageShape } from "@/lib/imageShape";

export type RenderableBlock = {
  id?: string;
  type: "text" | "image" | "link" | "video";
  content: Record<string, unknown>;
  // Section/column layout (pages only -- see PageRenderer, which groups
  // blocks sharing the same `position` into one row and lays them out
  // side by side by `columnIndex`/`columnWidth`). Optional and unused by
  // this component itself, and absent entirely on blog posts and on
  // snapshots published before sections existed.
  position?: number;
  columnIndex?: number;
  columnWidth?: number;
  sectionBgImageUrl?: string | null;
  sectionBgColor?: string;
  sectionBgOpacity?: number;
};

const ALIGN_CLASS: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

export function BlockRenderer({ block }: { block: RenderableBlock }) {
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
      if (!url) return null;
      // circle/oval default to a smaller max-width -- a full-2xl-wide
      // circle reads as oversized; none/rounded keep the original rectangle
      // sizing unchanged.
      const maxWidth = shape === "circle" || shape === "oval" ? "max-w-xs" : "max-w-2xl";
      return (
        <div className={`${maxWidth} ${ALIGN_CLASS[alignment] ?? "mx-auto"}`}>
          <Image src={url} alt={altText} width={1200} height={800} className={IMAGE_SHAPE_CLASS[shape]} unoptimized />
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
      return (
        <div className="aspect-video max-w-3xl overflow-hidden rounded-md">
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
      );
    }
    default:
      return null;
  }
}
