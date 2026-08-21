// Plain data/types shared between the (server) page editor loader and the
// (client) SectionBlockEditor component. Deliberately has NO "use client"
// directive -- everything exported from a "use client" file is treated as
// client-only by Next's RSC bundler, and calling one of those functions
// from a Server Component throws at runtime ("Attempted to call X() from
// the server but X is on the client"). That's exactly what happened here
// the first time this lived inside SectionBlockEditor.tsx.
import type { ImageBlockValue } from "@/components/admin/blocks/ImageBlockEditor";
import type { LinkBlockValue } from "@/components/admin/blocks/LinkBlockEditor";
import type { VideoBlockValue } from "@/components/admin/blocks/VideoBlockEditor";
import type { MapBlockValue } from "@/components/admin/blocks/MapBlockEditor";
import type { ContactFormBlockValue } from "@/components/admin/blocks/ContactFormBlockEditor";

// Pages only (posts keep the simpler, single-column BlockEditor -- blog
// posts have their own format per the client's explicit call).
//
// A page is a list of *sections*, rendered top to bottom. Each section has
// 1-3 *columns*, rendered side by side, and each column can stack any
// number of content blocks top to bottom ("quiero 2 textos y 1 imagen" in
// one side of a section -- previously a column held at most one block).
// This maps onto ContentBlock.position (shared by every block in a
// section -> the section's row), .columnIndex/.columnWidth (this block's
// slot and width within that row), and .blockOrder (this block's order
// within its column's stack). A section's own background (separate from
// the page's overall background) is stored the same denormalized way:
// identical sectionBg* values on every block row belonging to that
// position -- see the schema comment on ContentBlock. One consequence: a
// section needs at least one filled column for its background to have
// somewhere to be saved; a fully empty section has no rows to carry it.

export type BlockType = "text" | "image" | "link" | "video" | "map" | "contactForm";

export type BlockValue =
  | { type: "text"; content: { html: string } }
  | { type: "image"; content: ImageBlockValue }
  | { type: "link"; content: LinkBlockValue }
  | { type: "video"; content: VideoBlockValue }
  // Map/contact form: real, addable blocks now (see blocks.ts's comment) --
  // no longer a fixed section shown on every page.
  | { type: "map"; content: MapBlockValue }
  | { type: "contactForm"; content: ContactFormBlockValue };

// One entry in a column's stack -- `id` is the ContentBlock row's id (or a
// generated placeholder for a not-yet-saved block), separate from the
// column's own id since a column no longer maps 1:1 to a single block.
export type EditorBlockItem = { id: string; block: BlockValue };
export type EditorColumn = { id: string; width: number; blocks: EditorBlockItem[] };
// videoUrl: an uploaded mp4/webm shown instead of imageUrl when set (the
// section background picker's "Video" tab) -- see BackgroundOverlay.tsx.
export type SectionBackground = { imageUrl: string; color: string; opacity: number; videoUrl: string; gradientEnd: string };
export type EditorSection = { id: string; columns: EditorColumn[]; background: SectionBackground };

export const EMPTY_SECTION_BACKGROUND: SectionBackground = {
  imageUrl: "",
  color: "#000000",
  opacity: 0,
  videoUrl: "",
  gradientEnd: "",
};

// crypto.randomUUID() only exists in a secure context (HTTPS/localhost) and
// throws over plain HTTP -- see BlockEditor.tsx for the incident this came
// from. This is only ever a React key, not a real credential, so a plain
// generator is fine.
export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyContent(type: BlockType): BlockValue {
  switch (type) {
    case "text":
      return { type, content: { html: "<p></p>" } };
    case "image":
      return { type, content: { url: "", altText: "", alignment: "center", shape: "none", focalX: 50, focalY: 50, zoom: 1, width: 100 } };
    case "link":
      return { type, content: { label: "", href: "", internal: true, newTab: false } };
    case "video":
      return { type, content: { url: "", alignment: "center", shape: "none", width: 100 } };
    case "map":
      return { type, content: { address: "" } };
    case "contactForm":
      return { type, content: { enabledFields: ["name", "email", "message"] } };
  }
}

export function evenWidths(count: number): number[] {
  const base = Math.floor(100 / count);
  const widths = Array<number>(count).fill(base);
  widths[widths.length - 1] = 100 - base * (count - 1); // remainder goes to the last column
  return widths;
}

export function newSection(columnCount: 1 | 2 | 3): EditorSection {
  return {
    id: generateId(),
    columns: evenWidths(columnCount).map((width) => ({ id: generateId(), width, blocks: [] })),
    background: { ...EMPTY_SECTION_BACKGROUND },
  };
}

/**
 * Groups a flat, position/columnIndex/blockOrder-ordered list of DB rows
 * (as loaded by the page editor's server component) back into sections for
 * the editor. Blocks sharing the same `position` are one section's
 * columns, in `columnIndex` order; blocks sharing both `position` AND
 * `columnIndex` stack in one column, in `blockOrder` order -- the same
 * convention `serializeSections` writes.
 */
export function groupBlocksIntoSections(
  blocks: Array<{
    id: string;
    type: BlockType;
    content: unknown;
    position: number;
    columnIndex: number;
    columnWidth: number;
    sectionBgImageUrl: string | null;
    sectionBgColor: string;
    sectionBgOpacity: number;
    sectionBgVideoUrl: string | null;
    sectionBgGradientEnd: string | null;
  }>,
): EditorSection[] {
  const sections: EditorSection[] = [];
  let currentPosition: number | null = null;
  for (const b of blocks) {
    if (currentPosition === null || b.position !== currentPosition) {
      sections.push({
        id: generateId(),
        columns: [],
        background: {
          imageUrl: b.sectionBgImageUrl ?? "",
          color: b.sectionBgColor,
          opacity: b.sectionBgOpacity,
          videoUrl: b.sectionBgVideoUrl ?? "",
          gradientEnd: b.sectionBgGradientEnd ?? "",
        },
      });
      currentPosition = b.position;
    }
    const section = sections[sections.length - 1];
    // Columns can arrive out of order relative to their index (shouldn't
    // normally happen given the orderBy, but a malformed/older row
    // shouldn't crash the editor) -- pad with empty columns as needed.
    while (section.columns.length <= b.columnIndex) {
      section.columns.push({ id: generateId(), width: b.columnWidth, blocks: [] });
    }
    const col = section.columns[b.columnIndex];
    col.width = b.columnWidth;
    col.blocks.push({ id: b.id, block: { type: b.type, content: b.content } as BlockValue });
  }
  return sections;
}

/** Flattens editor state back into the flat blocksJson shape the server expects. */
export function serializeSections(sections: EditorSection[]) {
  const out: Array<{
    id: string;
    type: BlockType;
    content: unknown;
    position: number;
    columnIndex: number;
    columnWidth: number;
    blockOrder: number;
    sectionBgImageUrl: string;
    sectionBgColor: string;
    sectionBgOpacity: number;
    sectionBgVideoUrl: string;
    sectionBgGradientEnd: string;
  }> = [];
  sections.forEach((section, position) => {
    section.columns.forEach((col, columnIndex) => {
      col.blocks.forEach((item, blockOrder) => {
        out.push({
          id: item.id,
          type: item.block.type,
          content: item.block.content,
          position,
          columnIndex,
          columnWidth: col.width,
          blockOrder,
          sectionBgImageUrl: section.background.imageUrl,
          sectionBgColor: section.background.color,
          sectionBgOpacity: section.background.opacity,
          sectionBgVideoUrl: section.background.videoUrl,
          sectionBgGradientEnd: section.background.gradientEnd,
        });
      });
    });
  });
  return out;
}
