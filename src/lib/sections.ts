// Plain data/types shared between the (server) page editor loader and the
// (client) SectionBlockEditor component. Deliberately has NO "use client"
// directive -- everything exported from a "use client" file is treated as
// client-only by Next's RSC bundler, and calling one of those functions
// from a Server Component throws at runtime ("Attempted to call X() from
// the server but X is on the client"). That's exactly what happened here
// the first time this lived inside SectionBlockEditor.tsx.
import type { ImageBlockValue } from "@/components/admin/blocks/ImageBlockEditor";
import type { LinkBlockValue } from "@/components/admin/blocks/LinkBlockEditor";

// Pages only (posts keep the simpler, single-column BlockEditor -- blog
// posts have their own format per the client's explicit call).
//
// A page is a list of *sections*, rendered top to bottom. Each section has
// 1-3 *columns*, rendered side by side, and each column holds at most one
// content block. This maps onto ContentBlock.position (shared by every
// block in a section -> the section's row) and .columnIndex/.columnWidth
// (this block's slot and width within that row).

export type BlockType = "text" | "image" | "link" | "video";

export type BlockValue =
  | { type: "text"; content: { html: string } }
  | { type: "image"; content: ImageBlockValue }
  | { type: "link"; content: LinkBlockValue }
  | { type: "video"; content: { url: string } };

export type EditorColumn = { id: string; width: number; block: BlockValue | null };
export type EditorSection = { id: string; columns: EditorColumn[] };

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
      return { type, content: { url: "", altText: "", alignment: "center" } };
    case "link":
      return { type, content: { label: "", href: "", internal: true, newTab: false } };
    case "video":
      return { type, content: { url: "" } };
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
    columns: evenWidths(columnCount).map((width) => ({ id: generateId(), width, block: null })),
  };
}

/**
 * Groups a flat, position/columnIndex-ordered list of DB rows (as loaded by
 * the page editor's server component) back into sections for the editor.
 * Blocks sharing the same `position` are one section's columns, in
 * `columnIndex` order -- the same convention `serializeSections` writes.
 */
export function groupBlocksIntoSections(
  blocks: Array<{ id: string; type: BlockType; content: unknown; position: number; columnWidth: number }>,
): EditorSection[] {
  const sections: EditorSection[] = [];
  let currentPosition: number | null = null;
  for (const b of blocks) {
    if (currentPosition === null || b.position !== currentPosition) {
      sections.push({ id: generateId(), columns: [] });
      currentPosition = b.position;
    }
    sections[sections.length - 1].columns.push({
      id: b.id,
      width: b.columnWidth,
      block: { type: b.type, content: b.content } as BlockValue,
    });
  }
  return sections;
}

/** Flattens editor state back into the flat blocksJson shape the server expects. */
export function serializeSections(sections: EditorSection[]) {
  const out: Array<{ id: string; type: BlockType; content: unknown; position: number; columnIndex: number; columnWidth: number }> = [];
  sections.forEach((section, position) => {
    section.columns.forEach((col, columnIndex) => {
      if (!col.block) return;
      out.push({ id: col.id, type: col.block.type, content: col.block.content, position, columnIndex, columnWidth: col.width });
    });
  });
  return out;
}
