import { BlockRenderer, type RenderableBlock } from "@/components/blocks/BlockRenderer";
import { BackgroundOverlay } from "@/components/public/BackgroundOverlay";

export type PageRenderData = {
  id: string;
  title: string;
  blocks: RenderableBlock[];
  background?: { imageUrl?: string | null; overlayColor?: string | null; overlayOpacity?: number | null } | null;
};

/**
 * Groups the flat, already `position`/`columnIndex`-ordered block list into
 * sections: blocks sharing the same `position` are one section's columns,
 * rendered side by side. `position` is absent on snapshots published
 * before sections existed -- treat each of those blocks as its own
 * single-column section (today's flat layout, unchanged).
 */
function groupIntoSections(blocks: RenderableBlock[]) {
  const sections: RenderableBlock[][] = [];
  let currentPosition: number | undefined;
  let hasCurrentSection = false;
  for (const block of blocks) {
    const isNewSection = block.position === undefined || !hasCurrentSection || block.position !== currentPosition;
    if (isNewSection) {
      sections.push([]);
      currentPosition = block.position;
      hasCurrentSection = true;
    }
    sections[sections.length - 1].push(block);
  }
  return sections;
}

export function PageRenderer({ page }: { page: PageRenderData }) {
  return (
    <article>
      <BackgroundOverlay
        imageUrl={page.background?.imageUrl}
        overlayColor={page.background?.overlayColor}
        overlayOpacity={page.background?.overlayOpacity}
      >
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h1
            className={
              page.background?.imageUrl
                ? "text-4xl font-bold text-white"
                : "text-4xl font-bold text-slate-900"
            }
          >
            {page.title}
          </h1>
        </div>
      </BackgroundOverlay>

      <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        {groupIntoSections(page.blocks).map((section, i) => {
          const first = section[0];
          const row =
            section.length <= 1 ? (
              // Single-column section: no flex row needed, matches the
              // pre-sections layout exactly.
              <BlockRenderer key={first?.id ?? i} block={first} pageId={page.id} />
            ) : (
              <div key={first?.id ?? i} className="flex flex-col gap-6 sm:flex-row">
                {section.map((block, j) => (
                  <div
                    key={block.id ?? j}
                    className="min-w-0"
                    style={{ flexBasis: `${block.columnWidth ?? Math.round(100 / section.length)}%` }}
                  >
                    <BlockRenderer block={block} pageId={page.id} />
                  </div>
                ))}
              </div>
            );

          // A section's own background (separate from the page's overall
          // one) -- same imageUrl/color/opacity fields duplicated across
          // every block in this section (see ContentBlock schema comment).
          const hasSectionBg = Boolean(first?.sectionBgImageUrl) || (first?.sectionBgOpacity ?? 0) > 0;
          if (!hasSectionBg) return row;

          return (
            <BackgroundOverlay
              key={`bg-${first?.id ?? i}`}
              imageUrl={first?.sectionBgImageUrl}
              overlayColor={first?.sectionBgColor}
              overlayOpacity={first?.sectionBgOpacity}
            >
              <div className="rounded-md p-6">{row}</div>
            </BackgroundOverlay>
          );
        })}
      </div>
    </article>
  );
}
