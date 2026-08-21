"use client";

import { useState } from "react";
import type { MediaItem } from "@/components/admin/MediaGrid";
import { AddBlockMenu } from "@/components/admin/AddBlockMenu";
import { TextBlockEditor } from "@/components/admin/blocks/TextBlockEditor";
import { ImageBlockEditor, type ImageBlockValue } from "@/components/admin/blocks/ImageBlockEditor";
import { LinkBlockEditor, type LinkBlockValue } from "@/components/admin/blocks/LinkBlockEditor";
import { VideoBlockEditor, type VideoBlockValue } from "@/components/admin/blocks/VideoBlockEditor";

export type EditorBlock =
  | { id: string; type: "text"; content: { html: string } }
  | { id: string; type: "image"; content: ImageBlockValue }
  | { id: string; type: "link"; content: LinkBlockValue }
  | { id: string; type: "video"; content: VideoBlockValue };

const BLOCK_LABELS: Record<EditorBlock["type"], string> = {
  text: "Texto",
  image: "Imagen",
  link: "Enlace",
  video: "Video",
};
const BLOCK_TYPE_OPTIONS = (Object.keys(BLOCK_LABELS) as EditorBlock["type"][]).map((type) => ({ type, label: BLOCK_LABELS[type] }));

// crypto.randomUUID() only exists in a "secure context" (HTTPS or
// localhost) -- browsers omit it entirely over plain HTTP (e.g. accessed
// over Tailscale/LAN before a reverse proxy adds TLS). Every "+ Texto /
// Imagen / Enlace / Video" button here calls emptyBlock(), so on plain
// HTTP that threw an uncaught TypeError on every single one of them,
// crashing the editor to the browser's generic error screen. This doesn't
// need cryptographic randomness -- it's only a client-side React key /
// block identifier -- so use a plain generator that works everywhere.
function generateBlockId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyBlock(type: EditorBlock["type"]): EditorBlock {
  const id = generateBlockId();
  switch (type) {
    case "text":
      return { id, type, content: { html: "<p></p>" } };
    case "image":
      return { id, type, content: { url: "", altText: "", alignment: "center", shape: "none", focalX: 50, focalY: 50, zoom: 1 } };
    case "link":
      return { id, type, content: { label: "", href: "", internal: true, newTab: false } };
    case "video":
      return { id, type, content: { url: "", alignment: "center", shape: "none", width: 100 } };
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
            <TextBlockEditor html={block.content.html} onChange={(html) => update(block.id, { html })} mediaLibrary={mediaLibrary} />
          )}
          {block.type === "image" && (
            <ImageBlockEditor value={block.content} onChange={(v) => update(block.id, v)} mediaLibrary={mediaLibrary} />
          )}
          {block.type === "link" && (
            <LinkBlockEditor value={block.content} onChange={(v) => update(block.id, v)} pages={pages} />
          )}
          {block.type === "video" && (
            <VideoBlockEditor value={block.content} onChange={(v) => update(block.id, v)} />
          )}
        </div>
      ))}

      <AddBlockMenu options={BLOCK_TYPE_OPTIONS} onSelect={add} />
    </div>
  );
}
