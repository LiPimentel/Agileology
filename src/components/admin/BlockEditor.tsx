"use client";

import { useState } from "react";
import type { MediaItem } from "@/components/admin/MediaGrid";
import { TextBlockEditor } from "@/components/admin/blocks/TextBlockEditor";
import { ImageBlockEditor, type ImageBlockValue } from "@/components/admin/blocks/ImageBlockEditor";
import { LinkBlockEditor, type LinkBlockValue } from "@/components/admin/blocks/LinkBlockEditor";
import { VideoBlockEditor } from "@/components/admin/blocks/VideoBlockEditor";

export type EditorBlock =
  | { id: string; type: "text"; content: { html: string } }
  | { id: string; type: "image"; content: ImageBlockValue }
  | { id: string; type: "link"; content: LinkBlockValue }
  | { id: string; type: "video"; content: { url: string } };

const BLOCK_LABELS: Record<EditorBlock["type"], string> = {
  text: "Texto",
  image: "Imagen",
  link: "Enlace",
  video: "Video",
};

function emptyBlock(type: EditorBlock["type"]): EditorBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "text":
      return { id, type, content: { html: "<p></p>" } };
    case "image":
      return { id, type, content: { url: "", altText: "", alignment: "center" } };
    case "link":
      return { id, type, content: { label: "", href: "", internal: true, newTab: false } };
    case "video":
      return { id, type, content: { url: "" } };
  }
}

export function BlockEditor({
  initialBlocks,
  mediaLibrary,
  pages,
}: {
  initialBlocks: EditorBlock[];
  mediaLibrary: MediaItem[];
  pages: Array<{ slug: string; title: string }>;
}) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(initialBlocks);

  function update(id: string, content: EditorBlock["content"]) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, content } as EditorBlock) : b)));
  }
  function remove(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function add(type: EditorBlock["type"]) {
    setBlocks((prev) => [...prev, emptyBlock(type)]);
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="blocksJson" value={JSON.stringify(blocks)} readOnly />
      {blocks.map((block, i) => (
        <div key={block.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">{BLOCK_LABELS[block.type]}</span>
            <div className="flex gap-2 text-sm">
              <button type="button" disabled={i === 0} onClick={() => move(block.id, -1)} className="text-slate-500 hover:text-violet-700 disabled:opacity-30">
                ↑
              </button>
              <button type="button" disabled={i === blocks.length - 1} onClick={() => move(block.id, 1)} className="text-slate-500 hover:text-violet-700 disabled:opacity-30">
                ↓
              </button>
              <button type="button" onClick={() => remove(block.id)} className="text-red-600 hover:underline">
                Eliminar
              </button>
            </div>
          </div>
          {block.type === "text" && (
            <TextBlockEditor html={block.content.html} onChange={(html) => update(block.id, { html })} />
          )}
          {block.type === "image" && (
            <ImageBlockEditor value={block.content} onChange={(v) => update(block.id, v)} mediaLibrary={mediaLibrary} />
          )}
          {block.type === "link" && (
            <LinkBlockEditor value={block.content} onChange={(v) => update(block.id, v)} pages={pages} />
          )}
          {block.type === "video" && (
            <VideoBlockEditor url={block.content.url} onChange={(url) => update(block.id, { url })} />
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(BLOCK_LABELS) as EditorBlock["type"][]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => add(type)}
            className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-violet-400 hover:text-violet-700"
          >
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
