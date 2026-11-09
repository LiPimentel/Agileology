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
import type { CustomFormBlockValue } from "@/components/admin/blocks/CustomFormBlockEditor";
import { EMPTY_CAROUSEL, type CarouselBlockValue } from "@/components/admin/blocks/CarouselBlockEditor";
import { EMPTY_LATEST_POSTS, type LatestPostsBlockValue } from "@/components/admin/blocks/LatestPostsBlockEditor";
import { EMPTY_QUOTES, type QuotesBlockValue } from "@/components/admin/blocks/QuotesBlockEditor";
import { EMPTY_LINKEDIN_POSTS, type LinkedinPostsBlockValue } from "@/components/admin/blocks/LinkedinPostsBlockEditor";

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

export type BlockType = "text" | "image" | "link" | "video" | "map" | "contactForm" | "customForm" | "carousel" | "latestPosts" | "linkedinPosts" | "quotes";

export type BlockValue =
  | { type: "text"; content: { html: string } }
  | { type: "image"; content: ImageBlockValue }
  | { type: "link"; content: LinkBlockValue }
  | { type: "video"; content: VideoBlockValue }
  // Map/contact form: real, addable blocks now (see blocks.ts's comment) --
  // no longer a fixed section shown on every page.
  | { type: "map"; content: MapBlockValue }
  | { type: "contactForm"; content: ContactFormBlockValue }
  // One form picked from the reusable library (FormDefinition) -- see
  // lib/forms.ts's comment on why its fields are resolved at render time
  // instead of being stored here.
  | { type: "customForm"; content: CustomFormBlockValue }
  | { type: "carousel"; content: CarouselBlockValue }
  | { type: "latestPosts"; content: LatestPostsBlockValue }
  | { type: "linkedinPosts"; content: LinkedinPostsBlockValue }
  | { type: "quotes"; content: QuotesBlockValue };

// One entry in a column's stack -- `id` is the ContentBlock row's id (or a
// generated placeholder for a not-yet-saved block), separate from the
// column's own id since a column no longer maps 1:1 to a single block.
export type EditorBlockItem = { id: string; block: BlockValue };
export type EditorColumn = { id: string; width: number; blocks: EditorBlockItem[] };
// One block on a "free" (Wix-style) canvas section -- x/y/width/height are
// percentages of the section's own canvas box (0-100), NOT pixels. That's
// deliberate: it's what makes a free section scale down proportionally on
// a narrow screen (like shrinking a poster) without a second, separately-
// maintained mobile layout. zIndex only matters when two blocks overlap.
export type EditorFreeBlockItem = EditorBlockItem & { x: number; y: number; width: number; height: number; zIndex: number };
// videoUrl: an uploaded mp4/webm shown instead of imageUrl when set (the
// section background picker's "Video" tab) -- see BackgroundOverlay.tsx.
export type SectionBackground = { imageUrl: string; color: string; opacity: number; videoUrl: string; gradientEnd: string; focalX: number; focalY: number; zoom: number };
// "grid" (default): columns[] holds the content, exactly as before this
// existed -- every page built before free sections did keeps rendering
// identically. "free": freeBlocks[] holds the content instead, positioned
// on a freeHeight-tall canvas -- "quiero poder ajustar/mover/redimensionar
// elementos directamente ahí, aprovechando libremente el espacio de la
// página" (opt-in per section, not a replacement of the grid system).
// Where the section sits on the page: "full" = full width (default, as before), "main" = the centre
// column of the three-column grid, "left"/"right" = a side rail. See PageRenderer.
export type SectionZone = "full" | "main" | "left" | "right";
export const SECTION_ZONE_LABELS: Record<SectionZone, string> = {
  full: "Ancho completo",
  main: "Centro",
  left: "Lateral izquierdo",
  right: "Lateral derecho",
};
export function parseZone(v: unknown): SectionZone {
  return v === "main" || v === "left" || v === "right" ? v : "full";
}
export type EditorSection = {
  id: string;
  layoutMode: "grid" | "free";
  zone: SectionZone;
  // Minimum height in px (0 = as tall as its content); set by dragging the section's bottom edge.
  minHeight?: number;
  // Editor only (never saved): a just-added section that is still asking which layout it should have.
  choosing?: boolean;
  columns: EditorColumn[];
  freeBlocks: EditorFreeBlockItem[];
  freeHeight: number;
  background: SectionBackground;
};

export const EMPTY_SECTION_BACKGROUND: SectionBackground = {
  imageUrl: "",
  color: "#000000",
  opacity: 0,
  videoUrl: "",
  gradientEnd: "",
  focalX: 50,
  focalY: 50,
  zoom: 1,
};

export const DEFAULT_FREE_HEIGHT = 400;

/**
 * Switches a section between grid and free layout, carrying its existing
 * blocks' CONTENT over (never silently discarding what an admin already
 * built) while resetting their LAYOUT to that mode's defaults -- grid
 * columns don't have x/y/w/h, and a free canvas doesn't have columns, so
 * there's no lossless mapping between the two, but losing content itself
 * on a mode toggle would be a much worse surprise than losing precise
 * positioning.
 */
export function convertSectionLayout(section: EditorSection, mode: "grid" | "free"): EditorSection {
  if (section.layoutMode === mode) return section;
  if (mode === "free") {
    const allBlocks = section.columns.flatMap((c) => c.blocks);
    const freeBlocks: EditorFreeBlockItem[] = allBlocks.map((item, i) => ({
      ...item,
      // Cascade new blocks so they don't all stack exactly on top of each
      // other -- still land somewhere sane if there were many.
      x: 10 + (i % 3) * 5,
      y: 10 + (i % 3) * 5,
      width: 40,
      height: 40,
      zIndex: i,
    }));
    return { ...section, layoutMode: "free", freeBlocks, columns: [{ id: generateId(), width: 100, blocks: [] }] };
  }
  const sorted = [...section.freeBlocks].sort((a, b) => a.zIndex - b.zIndex);
  return {
    ...section,
    layoutMode: "grid",
    columns: [{ id: generateId(), width: 100, blocks: sorted.map(({ id, block }) => ({ id, block })) }],
    freeBlocks: [],
  };
}

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
    case "customForm":
      return { type, content: { formId: "" } };
    case "carousel":
      return { type, content: { ...EMPTY_CAROUSEL, slides: [] } };
    case "latestPosts":
      return { type, content: { ...EMPTY_LATEST_POSTS } };
    case "linkedinPosts":
      return { type, content: { ...EMPTY_LINKEDIN_POSTS, posts: [] } };
    case "quotes":
      return { type, content: { ...EMPTY_QUOTES, quotes: [] } };
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
    layoutMode: "grid",
    zone: "full",
    columns: evenWidths(columnCount).map((width) => ({ id: generateId(), width, blocks: [] })),
    freeBlocks: [],
    freeHeight: DEFAULT_FREE_HEIGHT,
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
    sectionBgFocalX: number;
    sectionBgFocalY: number;
    sectionBgZoom: number;
    sectionZone: string;
    sectionMinHeight: number;
    sectionLayoutMode: string;
    sectionFreeHeight: number;
    freeX: number;
    freeY: number;
    freeWidth: number;
    freeHeight: number;
    freeZIndex: number;
  }>,
): EditorSection[] {
  const sections: EditorSection[] = [];
  let currentPosition: number | null = null;
  for (const b of blocks) {
    if (currentPosition === null || b.position !== currentPosition) {
      sections.push({
        id: generateId(),
        layoutMode: b.sectionLayoutMode === "free" ? "free" : "grid",
        zone: parseZone(b.sectionZone),
        minHeight: b.sectionMinHeight || 0,
        columns: [],
        freeBlocks: [],
        freeHeight: b.sectionFreeHeight || DEFAULT_FREE_HEIGHT,
        background: {
          imageUrl: b.sectionBgImageUrl ?? "",
          color: b.sectionBgColor,
          opacity: b.sectionBgOpacity,
          videoUrl: b.sectionBgVideoUrl ?? "",
          gradientEnd: b.sectionBgGradientEnd ?? "",
          focalX: b.sectionBgFocalX ?? 50,
          focalY: b.sectionBgFocalY ?? 50,
          zoom: b.sectionBgZoom ?? 1,
        },
      });
      currentPosition = b.position;
    }
    const section = sections[sections.length - 1];
    const block = { type: b.type, content: b.content } as BlockValue;
    if (section.layoutMode === "free") {
      section.freeBlocks.push({ id: b.id, block, x: b.freeX, y: b.freeY, width: b.freeWidth, height: b.freeHeight, zIndex: b.freeZIndex });
      continue;
    }
    // Columns can arrive out of order relative to their index (shouldn't
    // normally happen given the orderBy, but a malformed/older row
    // shouldn't crash the editor) -- pad with empty columns as needed.
    while (section.columns.length <= b.columnIndex) {
      section.columns.push({ id: generateId(), width: b.columnWidth, blocks: [] });
    }
    const col = section.columns[b.columnIndex];
    col.width = b.columnWidth;
    col.blocks.push({ id: b.id, block });
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
    sectionBgFocalX: number;
    sectionBgFocalY: number;
    sectionBgZoom: number;
    sectionZone: SectionZone;
    sectionMinHeight: number;
    sectionLayoutMode: string;
    sectionFreeHeight: number;
    freeX: number;
    freeY: number;
    freeWidth: number;
    freeHeight: number;
    freeZIndex: number;
  }> = [];
  sections.forEach((section, position) => {
    const sectionFields = {
      sectionBgImageUrl: section.background.imageUrl,
      sectionBgColor: section.background.color,
      sectionBgOpacity: section.background.opacity,
      sectionBgVideoUrl: section.background.videoUrl,
      sectionBgGradientEnd: section.background.gradientEnd,
      sectionBgFocalX: section.background.focalX,
      sectionBgFocalY: section.background.focalY,
      sectionBgZoom: section.background.zoom,
      sectionZone: section.zone,
      sectionMinHeight: section.minHeight ?? 0,
      sectionLayoutMode: section.layoutMode,
      sectionFreeHeight: section.freeHeight,
    };
    if (section.layoutMode === "free") {
      section.freeBlocks.forEach((item, blockOrder) => {
        out.push({
          id: item.id,
          type: item.block.type,
          content: item.block.content,
          position,
          columnIndex: 0,
          columnWidth: 100,
          blockOrder,
          freeX: item.x,
          freeY: item.y,
          freeWidth: item.width,
          freeHeight: item.height,
          freeZIndex: item.zIndex,
          ...sectionFields,
        });
      });
      return;
    }
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
          freeX: 10,
          freeY: 10,
          freeWidth: 30,
          freeHeight: 30,
          freeZIndex: 0,
          ...sectionFields,
        });
      });
    });
  });
  return out;
}
