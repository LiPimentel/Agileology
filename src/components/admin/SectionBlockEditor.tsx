"use client";

import { useRef, useState, type ReactNode } from "react";
import type { MediaItem } from "@/components/admin/MediaGrid";
import { AddBlockMenu } from "@/components/admin/AddBlockMenu";
import { BackgroundPicker, type BackgroundValue } from "@/components/admin/BackgroundPicker";
import { BackgroundOverlay } from "@/components/public/BackgroundOverlay";
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
  function setColumnType(sectionId: string, columnId: string, type: BlockType) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, columns: s.columns.map((c) => (c.id === columnId ? { ...c, block: emptyContent(type) } : c)) },
      ),
    );
  }
  function clearColumn(sectionId: string, columnId: string) {
    setSections((prev) =>
      prev.map((s) => (s.id !== sectionId ? s : { ...s, columns: s.columns.map((c) => (c.id === columnId ? { ...c, block: null } : c)) })),
    );
  }
  function updateColumnContent(sectionId: string, columnId: string, content: unknown) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              columns: s.columns.map((c) => (c.id === columnId && c.block ? { ...c, block: { ...c.block, content } as BlockValue } : c)),
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

  function renderColumn(section: EditorSection, col: EditorColumn, showWidthInput: boolean) {
    return (
      <div key={col.id} className="min-w-0 rounded-md border border-dashed border-slate-200 p-3">
        {showWidthInput && (
          <div className="mb-2">
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
        {!col.block ? (
          <AddBlockMenu options={BLOCK_TYPE_OPTIONS} onSelect={(type) => setColumnType(section.id, col.id, type)} />
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{BLOCK_LABELS[col.block.type]}</span>
              <button type="button" onClick={() => clearColumn(section.id, col.id)} className="text-xs text-red-600 hover:underline">
                Quitar
              </button>
            </div>
            {col.block.type === "text" && (
              <TextBlockEditor html={col.block.content.html} onChange={(html) => updateColumnContent(section.id, col.id, { html })} mediaLibrary={mediaLibrary} />
            )}
            {col.block.type === "image" && (
              <ImageBlockEditor value={col.block.content} onChange={(v) => updateColumnContent(section.id, col.id, v)} mediaLibrary={mediaLibrary} />
            )}
            {col.block.type === "link" && (
              <LinkBlockEditor value={col.block.content} onChange={(v) => updateColumnContent(section.id, col.id, v)} pages={pages} />
            )}
            {col.block.type === "video" && (
              <VideoBlockEditor value={col.block.content} onChange={(v) => updateColumnContent(section.id, col.id, v)} />
            )}
            {col.block.type === "map" && (
              <MapBlockEditor value={col.block.content} onChange={(v) => updateColumnContent(section.id, col.id, v)} />
            )}
            {col.block.type === "contactForm" && (
              <ContactFormBlockEditor value={col.block.content} onChange={(v) => updateColumnContent(section.id, col.id, v)} />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          <div key={section.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Sección {i + 1} · {section.columns.length === 1 ? "1 componente" : `${section.columns.length} componentes`}
              </span>
              <div className="flex gap-2 text-sm">
                <button type="button" disabled={i === 0} onClick={() => moveSection(section.id, -1)} className="text-slate-500 hover:text-violet-700 disabled:opacity-30">
                  ↑
                </button>
                <button type="button" disabled={i === sections.length - 1} onClick={() => moveSection(section.id, 1)} className="text-slate-500 hover:text-violet-700 disabled:opacity-30">
                  ↓
                </button>
                <button type="button" onClick={() => removeSection(section.id)} className="text-red-600 hover:underline">
                  Eliminar sección
                </button>
              </div>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={() => toggleSectionBgPicker(section.id)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                {openBgPickers[section.id] ? "Cerrar fondo de sección" : "Fondo de esta sección (color/imagen/video)"}
                {hasBg && " •"}
              </button>
              {openBgPickers[section.id] && (
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
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
            </div>

            {section.columns.length === 2 && (
              <div className="mb-4">
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

      <div className="flex flex-wrap gap-2">
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
