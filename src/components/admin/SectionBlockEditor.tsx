"use client";

import { useRef, useState, type ReactNode } from "react";
import type { MediaItem } from "@/components/admin/MediaGrid";
import { AddBlockMenu } from "@/components/admin/AddBlockMenu";
import { BackgroundPicker, type BackgroundValue } from "@/components/admin/BackgroundPicker";
import { BackgroundOverlay } from "@/components/public/BackgroundOverlay";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { TextBlockEditor } from "@/components/admin/blocks/TextBlockEditor";
import { ImageBlockEditor } from "@/components/admin/blocks/ImageBlockEditor";
import { LinkBlockEditor } from "@/components/admin/blocks/LinkBlockEditor";
import { VideoBlockEditor } from "@/components/admin/blocks/VideoBlockEditor";
import { MapBlockEditor } from "@/components/admin/blocks/MapBlockEditor";
import { ContactFormBlockEditor } from "@/components/admin/blocks/ContactFormBlockEditor";
import {
  type BlockType,
  type BlockValue,
  type EditorColumn,
  type EditorSection,
  emptyContent,
  generateId,
  newSection,
  serializeSections,
} from "@/lib/sections";

export type { EditorSection, EditorColumn } from "@/lib/sections";

const BLOCK_LABELS: Record<BlockType, string> = {
  text: "Texto",
  image: "Imagen",
  link: "Enlace",
  video: "Video",
  map: "Mapa",
  contactForm: "Formulario de contacto",
};
const BLOCK_TYPE_OPTIONS = (Object.keys(BLOCK_LABELS) as BlockType[]).map((type) => ({ type, label: BLOCK_LABELS[type] }));

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Whether BlockRenderer would actually draw something for this block, or just return null (no url/href/address yet). */
function hasContent(block: BlockValue): boolean {
  switch (block.type) {
    case "text":
      return Boolean(block.content.html?.replace(/<[^>]+>/g, "").trim());
    case "image":
      return Boolean(block.content.url);
    case "link":
      return Boolean(block.content.href);
    case "video":
      return Boolean(block.content.url);
    case "map":
      return Boolean(block.content.address);
    case "contactForm":
      return true;
  }
}

/**
 * The clean, unselected look of a block: exactly what the public page
 * renders (reusing BlockRenderer itself, not a hand-kept-in-sync copy of
 * it), so what you see on this canvas before clicking anything already IS
 * the real page -- "quiero ver la página real y hacer clic directo sobre
 * el componente para editarlo ahí mismo, en vez de un panel aparte".
 *
 * contactForm is the one exception: BlockRenderer's version is a real,
 * submittable form (it needs a pageId to attribute submissions) -- letting
 * an admin accidentally fire a real "test" submission from inside the
 * editor would pollute their actual inbox, so this shows a static card
 * instead of the live form.
 */
function BlockPreview({ block }: { block: BlockValue }) {
  if (block.type === "contactForm") {
    const fields = block.content.enabledFields ?? [];
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        📋 Formulario de contacto ({fields.length ? fields.join(", ") : "sin campos"}) — vista previa desactivada aquí
        para no generar envíos de prueba.
      </div>
    );
  }
  if (!hasContent(block)) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm italic text-slate-400">
        {BLOCK_LABELS[block.type]} vacío — clic para configurar
      </div>
    );
  }
  return <BlockRenderer block={{ type: block.type, content: block.content }} />;
}

/**
 * Real drag handle between a 2-column section's two columns (vs. only a
 * range slider) -- grabbing and dragging it live-resizes the split exactly
 * like Wix's column resize, instead of only having an abstract number to
 * type/slide.
 */
function TwoColumnRow({
  leftWidth,
  onSplit,
  children,
}: {
  leftWidth: number;
  onSplit: (leftWidth: number) => void;
  children: [ReactNode, ReactNode];
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    onSplit(clamp(Math.round(pct), 10, 90));
  }
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div ref={rowRef} className="flex items-stretch">
      <div className="min-w-0" style={{ flexBasis: `calc(${leftWidth}% - 8px)` }}>
        {children[0]}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="mx-1 flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center"
        title="Arrastra para redimensionar las columnas"
      >
        <div className="h-16 w-1 rounded-full bg-violet-300 hover:bg-violet-500" />
      </div>
      <div className="min-w-0" style={{ flexBasis: `calc(${100 - leftWidth}% - 8px)` }}>
        {children[1]}
      </div>
    </div>
  );
}

export function SectionBlockEditor({
  initialSections,
  mediaLibrary,
  pages,
}: {
  initialSections: EditorSection[];
  mediaLibrary: MediaItem[];
  pages: Array<{ slug: string; title: string }>;
}) {
  const [sections, setSections] = useState<EditorSection[]>(initialSections);
  const [openBgPickers, setOpenBgPickers] = useState<Record<string, boolean>>({});
  // Only one block editable at a time, canvas-wide -- clicking a different
  // block (or blank canvas space) closes whatever was open, matching a
  // normal "select one thing" editor instead of a stack of always-open
  // panels.
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  function addSection(columnCount: 1 | 2 | 3) {
    setSections((prev) => [...prev, newSection(columnCount)]);
  }
  function removeSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }
  function moveSection(sectionId: string, dir: -1 | 1) {
    setSections((prev) => {
      const i = prev.findIndex((s) => s.id === sectionId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  /**
   * Adds a block to a column's stack instead of replacing it -- a column
   * can hold any number of blocks. Selects the new block immediately so
   * "+ Agregar componente" click leads straight into editing it, instead
   * of adding it collapsed and making the admin click it again to open it.
   */
  function addBlockToColumn(sectionId: string, columnId: string, type: BlockType) {
    const id = generateId();
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              columns: s.columns.map((c) =>
                c.id === columnId ? { ...c, blocks: [...c.blocks, { id, block: emptyContent(type) }] } : c,
              ),
            },
      ),
    );
    setSelectedBlockId(id);
  }
  function removeBlockFromColumn(sectionId: string, columnId: string, blockId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, columns: s.columns.map((c) => (c.id === columnId ? { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) } : c)) },
      ),
    );
    setSelectedBlockId((prev) => (prev === blockId ? null : prev));
  }
  function moveBlockInColumn(sectionId: string, columnId: string, blockId: string, dir: -1 | 1) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          columns: s.columns.map((c) => {
            if (c.id !== columnId) return c;
            const i = c.blocks.findIndex((b) => b.id === blockId);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= c.blocks.length) return c;
            const blocks = [...c.blocks];
            [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
            return { ...c, blocks };
          }),
        };
      }),
    );
  }
  function updateBlockContent(sectionId: string, columnId: string, blockId: string, content: unknown) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              columns: s.columns.map((c) =>
                c.id !== columnId
                  ? c
                  : {
                      ...c,
                      blocks: c.blocks.map((b) => (b.id === blockId ? { ...b, block: { ...b.block, content } as BlockValue } : b)),
                    },
              ),
            },
      ),
    );
  }
  function setColumnWidth(sectionId: string, columnId: string, width: number) {
    setSections((prev) =>
      prev.map((s) => (s.id !== sectionId ? s : { ...s, columns: s.columns.map((c) => (c.id === columnId ? { ...c, width } : c)) })),
    );
  }
  /** For a 2-column section, one value drives the split: the other column always gets the remainder. */
  function setSplit(sectionId: string, leftWidth: number) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId || s.columns.length !== 2
          ? s
          : { ...s, columns: [{ ...s.columns[0], width: leftWidth }, { ...s.columns[1], width: 100 - leftWidth }] },
      ),
    );
  }
  function setSectionBackground(sectionId: string, bg: BackgroundValue) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              background: { imageUrl: bg.imageUrl, color: bg.color, opacity: bg.opacity, videoUrl: bg.videoUrl, gradientEnd: bg.gradientEnd },
            },
      ),
    );
  }
  function toggleSectionBgPicker(sectionId: string) {
    setOpenBgPickers((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  function renderBlockEditor(sectionId: string, columnId: string, item: EditorColumn["blocks"][number]) {
    const onChange = (v: unknown) => updateBlockContent(sectionId, columnId, item.id, v);
    switch (item.block.type) {
      case "text":
        return <TextBlockEditor html={item.block.content.html} onChange={(html) => onChange({ html })} mediaLibrary={mediaLibrary} />;
      case "image":
        return <ImageBlockEditor value={item.block.content} onChange={onChange} mediaLibrary={mediaLibrary} />;
      case "link":
        return <LinkBlockEditor value={item.block.content} onChange={onChange} pages={pages} />;
      case "video":
        return <VideoBlockEditor value={item.block.content} onChange={onChange} />;
      case "map":
        return <MapBlockEditor value={item.block.content} onChange={onChange} />;
      case "contactForm":
        return <ContactFormBlockEditor value={item.block.content} onChange={onChange} />;
    }
  }

  /**
   * One block in a column: a clean, click-to-select preview (the real
   * public render, via BlockPreview) when not selected, or the block's
   * usual editor -- with a compact attached toolbar (mover/quitar/listo)
   * instead of always-visible chrome -- when it is.
   */
  function renderBlockCanvas(section: EditorSection, col: EditorColumn, item: EditorColumn["blocks"][number], bi: number) {
    const selected = selectedBlockId === item.id;

    if (!selected) {
      return (
        <div
          key={item.id}
          role="button"
          tabIndex={0}
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedBlockId(item.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelectedBlockId(item.id);
            }
          }}
          className="group relative cursor-pointer rounded-md outline outline-2 outline-transparent transition hover:outline-violet-300"
        >
          <BlockPreview block={item.block} />
          <span className="pointer-events-none absolute -top-2.5 right-2 hidden rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow group-hover:inline-block">
            {BLOCK_LABELS[item.block.type]} · clic para editar
          </span>
        </div>
      );
    }

    return (
      <div key={item.id} onClick={(e) => e.stopPropagation()} className="rounded-md ring-2 ring-violet-500">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-[4px] bg-violet-700 px-2 py-1 text-xs text-white">
          <span className="font-medium">{BLOCK_LABELS[item.block.type]}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={bi === 0}
              onClick={() => moveBlockInColumn(section.id, col.id, item.id, -1)}
              className="hover:text-violet-200 disabled:opacity-40"
              title="Mover arriba"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={bi === col.blocks.length - 1}
              onClick={() => moveBlockInColumn(section.id, col.id, item.id, 1)}
              className="hover:text-violet-200 disabled:opacity-40"
              title="Mover abajo"
            >
              ↓
            </button>
            <button type="button" onClick={() => removeBlockFromColumn(section.id, col.id, item.id)} className="hover:text-red-200">
              Quitar
            </button>
            <button
              type="button"
              onClick={() => setSelectedBlockId(null)}
              className="rounded bg-white/20 px-2 py-0.5 font-medium hover:bg-white/30"
            >
              Listo ✓
            </button>
          </div>
        </div>
        <div className="rounded-b-md border border-t-0 border-violet-200 bg-white p-3">{renderBlockEditor(section.id, col.id, item)}</div>
      </div>
    );
  }

  function renderColumn(section: EditorSection, col: EditorColumn, showWidthInput: boolean) {
    return (
      <div key={col.id} className="min-w-0 space-y-2">
        {showWidthInput && (
          <div>
            <label className="block text-xs font-medium text-slate-500">Ancho (%)</label>
            <input
              type="number"
              min={10}
              max={80}
              value={col.width}
              onChange={(e) => setColumnWidth(section.id, col.id, Number(e.target.value) || 0)}
              className="mt-1 w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
            />
          </div>
        )}
        <div className="space-y-3">
          {col.blocks.map((item, bi) => renderBlockCanvas(section, col, item, bi))}
          <div onClick={(e) => e.stopPropagation()}>
            <AddBlockMenu
              options={BLOCK_TYPE_OPTIONS}
              onSelect={(type) => addBlockToColumn(section.id, col.id, type)}
              label={col.blocks.length === 0 ? "+ Agregar componente" : "+ Agregar otro componente"}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    // Clicking any blank canvas area (not on a block's own click handler,
    // which stops propagation) closes whatever block is currently open --
    // the "clic afuera para cerrar" half of click-to-select.
    <div className="space-y-4" onClick={() => setSelectedBlockId(null)}>
      <input type="hidden" name="blocksJson" value={JSON.stringify(serializeSections(sections))} readOnly />

      {sections.map((section, i) => {
        // Same rule PageRenderer uses to decide whether a section has a
        // background of its own: real image, real video, or a visible
        // color overlay.
        const hasBg =
          Boolean(section.background.imageUrl) || Boolean(section.background.videoUrl) || section.background.opacity > 0;

        const columnsRow =
          section.columns.length === 2 ? (
            <TwoColumnRow leftWidth={section.columns[0].width} onSplit={(w) => setSplit(section.id, w)}>
              {[renderColumn(section, section.columns[0], false), renderColumn(section, section.columns[1], false)]}
            </TwoColumnRow>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row">
              {section.columns.map((col) => (
                <div key={col.id} className="min-w-0 flex-1" style={section.columns.length > 1 ? { flexBasis: `${col.width}%` } : undefined}>
                  {renderColumn(section, col, section.columns.length === 3)}
                </div>
              ))}
            </div>
          );

        return (
          <div key={section.id} className="group/section relative rounded-lg border border-slate-200 bg-white p-4">
            {/*
              Section-level chrome (move/remove/background/column widths):
              a compact badge that only appears on hover of the section,
              mirroring how Wix itself only shows a section's name/controls
              on hover (see the "Sección: Sobre mí" badge in the reference
              screenshot) instead of a permanent header bar competing with
              the actual content underneath.
            */}
            <div className="pointer-events-none absolute -top-3 right-3 z-10 hidden items-center gap-2 rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg group-hover/section:flex">
              <span className="pointer-events-auto font-medium">
                Sección {i + 1} · {section.columns.length === 1 ? "1 columna" : `${section.columns.length} columnas`}
              </span>
              <button type="button" disabled={i === 0} onClick={() => moveSection(section.id, -1)} className="pointer-events-auto hover:text-violet-300 disabled:opacity-30">
                ↑
              </button>
              <button type="button" disabled={i === sections.length - 1} onClick={() => moveSection(section.id, 1)} className="pointer-events-auto hover:text-violet-300 disabled:opacity-30">
                ↓
              </button>
              <button type="button" onClick={() => toggleSectionBgPicker(section.id)} className="pointer-events-auto hover:text-violet-300">
                Fondo{hasBg && " •"}
              </button>
              <button type="button" onClick={() => removeSection(section.id)} className="pointer-events-auto hover:text-red-300">
                Eliminar
              </button>
            </div>

            {openBgPickers[section.id] && (
              <div className="relative z-10 mb-4 rounded-md border border-slate-200 bg-slate-50 p-3" onClick={(e) => e.stopPropagation()}>
                <BackgroundPicker
                  compact
                  initialImageUrl={null}
                  initialColor="#000000"
                  initialOpacity={0}
                  mediaLibrary={mediaLibrary}
                  value={section.background}
                  onChange={(bg) => setSectionBackground(section.id, bg)}
                />
              </div>
            )}

            {section.columns.length === 2 && (
              <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                <label className="block text-xs font-medium text-slate-500">
                  Ancho de columnas ({section.columns[0].width}% / {section.columns[1].width}%) -- también puedes arrastrar el separador de abajo
                </label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={1}
                  value={section.columns[0].width}
                  onChange={(e) => setSplit(section.id, Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </div>
            )}

            {/*
              This is the actual "live preview" surface: when the section
              has a background it's rendered with the real BackgroundOverlay
              component (the exact same one the public page uses), at the
              real column widths -- so what's visible here while editing is
              what the published page will look like, not just an abstract
              form.
            */}
            {hasBg ? (
              <BackgroundOverlay
                imageUrl={section.background.imageUrl}
                overlayColor={section.background.color}
                overlayOpacity={section.background.opacity}
                videoUrl={section.background.videoUrl}
                gradientEnd={section.background.gradientEnd}
              >
                <div className="rounded-md p-4">{columnsRow}</div>
              </BackgroundOverlay>
            ) : (
              columnsRow
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => addSection(1)}
          className="rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:border-violet-500 hover:bg-violet-50"
        >
          + Sección (1 componente)
        </button>
        <button
          type="button"
          onClick={() => addSection(2)}
          className="rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:border-violet-500 hover:bg-violet-50"
        >
          + Sección (2 componentes)
        </button>
        <button
          type="button"
          onClick={() => addSection(3)}
          className="rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:border-violet-500 hover:bg-violet-50"
        >
          + Sección (3 componentes)
        </button>
      </div>
    </div>
  );
}
