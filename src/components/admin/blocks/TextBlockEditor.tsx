"use client";

import { useEffect, useRef, useState } from "react";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

// Alignment presets for an inline image (see insertImage/alignSelectedImage
// below) -- float-wrapped left/right so text flows around it, or a
// centered block. Kept as plain style strings rather than classes since
// this HTML is stored/rendered as raw content, not through Tailwind.
const IMAGE_ALIGN_STYLE: Record<"left" | "center" | "right", string> = {
  left: "float:left;max-width:45%;margin:0 1rem 1rem 0;",
  right: "float:right;max-width:45%;margin:0 0 1rem 1rem;",
  center: "display:block;max-width:80%;margin:1rem auto;",
};

// Grouped with a visual divider between groups (the client's own feedback:
// "agrúpalos, no sé por qué están separados" -- headings/format weren't
// visually grouped together before).
const TOOLBAR_GROUPS: Array<Array<{ label: string; command: string; value?: string }>> = [
  [
    { label: "B", command: "bold" },
    { label: "I", command: "italic" },
    { label: "U", command: "underline" },
    { label: "S", command: "strikeThrough" },
  ],
  [
    { label: "H1", command: "formatBlock", value: "H1" },
    { label: "H2", command: "formatBlock", value: "H2" },
    { label: "H3", command: "formatBlock", value: "H3" },
    { label: "P", command: "formatBlock", value: "P" },
  ],
  [
    { label: "• Lista", command: "insertUnorderedList" },
    { label: "1. Lista", command: "insertOrderedList" },
  ],
  [
    { label: "Izq", command: "justifyLeft" },
    { label: "Centro", command: "justifyCenter" },
    { label: "Der", command: "justifyRight" },
    { label: "Justificar", command: "justifyFull" },
  ],
];

// Real, stable Google Fonts family names (see the <link> in app/layout.tsx
// for why not next/font/google -- these values get saved into content).
const FONT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Predeterminada", value: "" },
  { label: "Roboto", value: "Roboto, Arial, sans-serif" },
  { label: "Open Sans", value: "'Open Sans', Arial, sans-serif" },
  { label: "Montserrat", value: "Montserrat, Arial, sans-serif" },
  { label: "Lato", value: "Lato, Arial, sans-serif" },
  { label: "Poppins", value: "Poppins, Arial, sans-serif" },
  { label: "Nunito", value: "Nunito, Arial, sans-serif" },
  { label: "Raleway", value: "Raleway, Arial, sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
  { label: "Merriweather", value: "Merriweather, Georgia, serif" },
  { label: "Oswald", value: "Oswald, Arial, sans-serif" },
  { label: "Bebas Neue", value: "'Bebas Neue', Arial, sans-serif" },
  { label: "Monoespaciada", value: "'Courier New', monospace" },
];

export function TextBlockEditor({
  html,
  onChange,
  mediaLibrary = [],
}: {
  html: string;
  onChange: (html: string) => void;
  mediaLibrary?: MediaItem[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  // Native <input type="color">/<select> steal focus from the
  // contentEditable div the moment they're interacted with, which loses
  // the text selection execCommand needs to know what to style. Save it
  // right before that happens, restore it right before running the
  // command.
  const savedRange = useRef<Range | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  // The <img> the user last clicked inside the editor, if any -- lets the
  // "Imagen: Izq/Centro/Der" buttons target a specific already-inserted
  // image instead of only being able to set alignment at insert time.
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);

  // Uncontrolled on purpose: contentEditable owns the DOM after the first
  // paint. Re-applying `html` on every keystroke would fight the browser's
  // caret position, so we only seed it once.
  useEffect(() => {
    if (!initialized.current && ref.current) {
      ref.current.innerHTML = html;
      initialized.current = true;
    }
  }, [html]);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRange.current);
  }

  // Makes execCommand('foreColor'/'fontName') emit inline style="..." on a
  // <span> instead of legacy <font color/face> tags -- matches what the
  // server-side sanitizer (src/lib/sanitize.ts) expects to keep.
  function ensureStyleWithCSS() {
    document.execCommand("styleWithCSS", false, "true");
  }

  function exec(command: string, value?: string) {
    ref.current?.focus();
    ensureStyleWithCSS();
    document.execCommand(command, false, value);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function execWithRestoredSelection(command: string, value?: string) {
    ref.current?.focus();
    restoreSelection();
    ensureStyleWithCSS();
    document.execCommand(command, false, value);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function addLink() {
    const url = window.prompt("URL del enlace:");
    if (url) exec("createLink", url);
  }

  // Paste as plain text: pasting from Word/Google Docs/another website
  // otherwise carries that source's own inline styles (font, size, margins)
  // into the block, fighting this block's styling and producing exactly
  // the "pasted from elsewhere and it came out wrong" layout breakage.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  // Inserts an image at the last caret position inside the text (not as a
  // separate block) -- "no me permite poner la imagen dentro del texto en
  // el nivel que quiero". Built via a real <img> element and serialized
  // through .outerHTML (browser-escaped) rather than string-concatenating
  // the url into markup by hand.
  function insertImage(url: string) {
    ref.current?.focus();
    restoreSelection();
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.setAttribute("style", IMAGE_ALIGN_STYLE.left);
    document.execCommand("insertHTML", false, img.outerHTML);
    if (ref.current) onChange(ref.current.innerHTML);
    setImagePickerOpen(false);
  }

  function alignSelectedImage(align: "left" | "center" | "right") {
    if (!selectedImg) return;
    selectedImg.setAttribute("style", IMAGE_ALIGN_STYLE[align]);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function handleEditorClick(e: React.MouseEvent<HTMLDivElement>) {
    setSelectedImg(e.target instanceof HTMLImageElement ? e.target : null);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-t-md border border-b-0 border-slate-300 bg-slate-50 p-1">
        {TOOLBAR_GROUPS.map((group, gi) => (
          <div key={gi} className="flex gap-0.5 border-r border-slate-300 pr-2 last:border-r-0">
            {group.map((t) => (
              <button
                key={t.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec(t.command, t.value)}
                className="rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {t.label}
              </button>
            ))}
          </div>
        ))}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={addLink}
            className="rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            Enlace
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => setImagePickerOpen((v) => !v)}
            className="rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            + Imagen
          </button>

          {/*
            Only shown once an already-inserted image is clicked -- lets
            the user change where text wraps around it (or center it)
            after the fact, not just at insert time.
          */}
          {selectedImg && (
            <div className="flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-1">
              <span className="text-xs text-violet-700">Imagen:</span>
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => alignSelectedImage(align)}
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-200"
                >
                  {align === "left" ? "Izq" : align === "center" ? "Centro" : "Der"}
                </button>
              ))}
            </div>
          )}

          <select
            onMouseDown={saveSelection}
            onChange={(e) => {
              execWithRestoredSelection("fontName", e.target.value || "inherit");
              e.target.value = "";
            }}
            defaultValue=""
            className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700"
            title="Tipo de letra"
          >
            <option value="" disabled>
              Fuente
            </option>
            {FONT_OPTIONS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <label
            className="flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            title="Color de texto"
          >
            Color
            <input
              type="color"
              onMouseDown={saveSelection}
              onChange={(e) => execWithRestoredSelection("foreColor", e.target.value)}
              className="h-5 w-5 cursor-pointer border-0 p-0"
            />
          </label>
        </div>
      </div>
      {imagePickerOpen && (
        <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <MediaUploadForm onUploaded={(m) => insertImage(m.url)} />
          <div className="mt-3">
            <MediaGrid items={mediaLibrary} onSelect={(m) => insertImage(m.url)} />
          </div>
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        onClick={handleEditorClick}
        // Same prose classes BlockRenderer.tsx uses for the public render
        // (not prose-sm, which under-sizes headings vs. how they'll
        // actually look live) -- so what you type here is what the page
        // will actually look like, not a smaller/plainer approximation.
        className="prose prose-slate min-h-32 max-w-none prose-headings:text-slate-900 prose-a:text-violet-700 rounded-b-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
      />
    </div>
  );
}
