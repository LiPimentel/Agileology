"use client";

import { useState } from "react";
import type { MediaItem } from "@/components/admin/MediaGrid";
import { TextBlockEditor } from "@/components/admin/blocks/TextBlockEditor";
import { ImageBlockEditor } from "@/components/admin/blocks/ImageBlockEditor";
import { LinkBlockEditor } from "@/components/admin/blocks/LinkBlockEditor";
import { VideoBlockEditor } from "@/components/admin/blocks/VideoBlockEditor";
import {
  type BlockType,
  type BlockValue,
  type EditorSection,
  emptyContent,
  newSection,
  serializeSections,
} from "@/lib/sections";

export type { EditorSection, EditorColumn } from "@/lib/sections";

const BLOCK_LABELS: Record<BlockType, string> = { text: "Texto", image: "Imagen", link: "Enlace", video: "Video" };

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
  /** For a 2-column section, one slider drives the split: the other column always gets the remainder. */
  function setSplit(sectionId: string, leftWidth: number) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId || s.columns.length !== 2
          ? s
          : { ...s, columns: [{ ...s.columns[0], width: leftWidth }, { ...s.columns[1], width: 100 - leftWidth }] },
      ),
    );
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="blocksJson" value={JSON.stringify(serializeSections(sections))} readOnly />

      {sections.map((section, i) => (
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

          {section.columns.length === 2 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500">
                Ancho de columnas ({section.columns[0].width}% / {section.columns[1].width}%)
              </label>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={section.columns[0].width}
                onChange={(e) => setSplit(section.id, Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row">
            {section.columns.map((col) => (
              <div
                key={col.id}
                className="min-w-0 flex-1 rounded-md border border-dashed border-slate-200 p-3"
                style={section.columns.length > 1 ? { flexBasis: `${col.width}%` } : undefined}
              >
                {section.columns.length === 3 && (
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
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(BLOCK_LABELS) as BlockType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setColumnType(section.id, col.id, type)}
                        className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-violet-400 hover:text-violet-700"
                      >
                        + {BLOCK_LABELS[type]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">{BLOCK_LABELS[col.block.type]}</span>
                      <button type="button" onClick={() => clearColumn(section.id, col.id)} className="text-xs text-red-600 hover:underline">
                        Quitar
                      </button>
                    </div>
                    {col.block.type === "text" && (
                      <TextBlockEditor html={col.block.content.html} onChange={(html) => updateColumnContent(section.id, col.id, { html })} />
                    )}
                    {col.block.type === "image" && (
                      <ImageBlockEditor value={col.block.content} onChange={(v) => updateColumnContent(section.id, col.id, v)} mediaLibrary={mediaLibrary} />
                    )}
                    {col.block.type === "link" && (
                      <LinkBlockEditor value={col.block.content} onChange={(v) => updateColumnContent(section.id, col.id, v)} pages={pages} />
                    )}
                    {col.block.type === "video" && (
                      <VideoBlockEditor url={col.block.content.url} onChange={(url) => updateColumnContent(section.id, col.id, { url })} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

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
