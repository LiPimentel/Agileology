import { BlockRenderer, type RenderableBlock } from "@/components/blocks/BlockRenderer";
import { BackgroundOverlay } from "@/components/public/BackgroundOverlay";

export type PageRenderData = {
  id: string;
  title: string;
  blocks: RenderableBlock[];
  background?: {
    imageUrl?: string | null;
    overlayColor?: string | null;
    overlayOpacity?: number | null;
    // A real image (logo, hero photo) shown in the banner above the
    // title -- distinct from imageUrl, which is a full-bleed CSS
    // background-cover behind everything.
    bannerImageUrl?: string | null;
    // Whether the banner block below renders at all. undefined (snapshots
    // published before this existed) defaults to true, matching the old,
    // always-on behavior exactly.
    showBanner?: boolean;
  } | null;
};

/**
 * Groups the flat, already `position`/`columnIndex`/`blockOrder`-ordered
 * block list into sections: blocks sharing the same `position` are one
 * section's columns, rendered side by side; blocks within a section that
 * also share the same `columnIndex` stack top to bottom in one column
 * ("quiero 2 textos y 1 imagen" in one side of a section). `position` is
 * absent on snapshots published before sections existed -- treat each of
 * those blocks as its own single-column section (today's flat layout,
 * unchanged).
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

/** Groups one section's blocks (already columnIndex-ordered) into columns, preserving block order within each. */
function groupIntoColumns(section: RenderableBlock[]) {
  const columns: RenderableBlock[][] = [];
  let currentColumnIndex: number | undefined;
  let hasCurrentColumn = false;
  for (const block of section) {
    const isNewColumn = block.columnIndex === undefined || !hasCurrentColumn || block.columnIndex !== currentColumnIndex;
    if (isNewColumn) {
      columns.push([]);
      currentColumnIndex = block.columnIndex;
      hasCurrentColumn = true;
    }
    columns[columns.length - 1].push(block);
  }
  return columns;
}

export function PageRenderer({ page }: { page: PageRenderData }) {
  // "eso no puede estar fijo como obligatorio en cada página" -- this
  // banner used to render unconditionally on every page (even with no
  // image/color set, just a flat purple bar), leaving no way to put a
  // video/slideshow section directly under the header instead. Defaults to
  // true so every page published before this existed keeps its exact
  // current look.
  const showBanner = page.background?.showBanner ?? true;

  return (
    <article>
      {showBanner ? (
        <BackgroundOverlay
          imageUrl={page.background?.imageUrl}
          overlayColor={page.background?.overlayColor}
          overlayOpacity={page.background?.overlayOpacity}
        >
          <div className={`mx-auto max-w-4xl px-6 py-16 ${page.background?.bannerImageUrl ? "text-center" : ""}`}>
            {page.background?.bannerImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.background.bannerImageUrl} alt="" className="mx-auto mb-4 max-h-24 max-w-full object-contain" />
            )}
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
      ) : (
        // Banner turned off for this page -- still need exactly one <h1>
        // for accessibility/SEO, just not shown visually (the page's own
        // first section takes over immediately below the nav instead).
        <h1 className="sr-only">{page.title}</h1>
      )}

      <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        {groupIntoSections(page.blocks).map((section, i) => {
          const first = section[0];
          const columns = groupIntoColumns(section);
          const row =
            columns.length <= 1 ? (
              // Single-column section: no flex row needed, matches the
              // pre-sections layout exactly. Multiple blocks stacked in
              // that one column still stack vertically.
              <div key={first?.id ?? i} className="flex flex-col gap-6">
                {(columns[0] ?? [first]).map((block, j) => (
                  <BlockRenderer key={block?.id ?? j} block={block} pageId={page.id} />
                ))}
              </div>
            ) : (
              <div key={first?.id ?? i} className="flex flex-col gap-6 sm:flex-row">
                {columns.map((col, j) => (
                  <div
                    key={col[0]?.id ?? j}
                    className="flex min-w-0 flex-col gap-6"
                    style={{ flexBasis: `${col[0]?.columnWidth ?? Math.round(100 / columns.length)}%` }}
                  >
                    {col.map((block, k) => (
                      <BlockRenderer key={block.id ?? k} block={block} pageId={page.id} />
                    ))}
                  </div>
                ))}
              </div>
            );

          // A section's own background (separate from the page's overall
          // one) -- same imageUrl/color/opacity/videoUrl fields duplicated
          // across every block in this section (see ContentBlock schema
          // comment).
          const hasSectionBg =
            Boolean(first?.sectionBgImageUrl) || Boolean(first?.sectionBgVideoUrl) || (first?.sectionBgOpacity ?? 0) > 0;
          if (!hasSectionBg) return row;

          return (
            <BackgroundOverlay
              key={`bg-${first?.id ?? i}`}
              imageUrl={first?.sectionBgImageUrl}
              overlayColor={first?.sectionBgColor}
              overlayOpacity={first?.sectionBgOpacity}
              videoUrl={first?.sectionBgVideoUrl}
              gradientEnd={first?.sectionBgGradientEnd}
            >
              <div className="rounded-md p-6">{row}</div>
            </BackgroundOverlay>
          );
        })}
      </div>
    </article>
  );
}
