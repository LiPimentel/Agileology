"use client";

import { useEffect, useRef, useState } from "react";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BulletListIcon,
  H1Icon,
  H2Icon,
  H3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  NumberListIcon,
  ParagraphIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "./ToolbarIcons";

// Alignment presets for an inline image (see insertImage/alignSelectedImage
// below) -- float-wrapped left/right so text flows around it, or a
// centered block. Kept as plain style strings rather than classes since
// this HTML is stored/rendered as raw content, not through Tailwind.
const IMAGE_ALIGN_STYLE: Record<"left" | "center" | "right", string> = {
  left: "float:left;max-width:45%;margin:0 1rem 1rem 0;",
  right: "float:right;max-width:45%;margin:0 0 1rem 1rem;",
  center: "display:block;max-width:80%;margin:1rem auto;",
};

// Grouped with a visual divider between groups, traditional icon-based
// buttons (the client's own feedback: "usar los iconos tradicionales...
// esa barra de formato de texto debe tener el formato tradicional con
// iconos" -- text labels like "Izq"/"Centro"/"H1" weren't what she meant
// by a familiar toolbar). `title` doubles as the tooltip and the
// accessible name, since the visible content is now just an icon.
const TOOLBAR_GROUPS: Array<Array<{ title: string; Icon: (p: { className?: string }) => React.ReactElement; command: string; value?: string }>> = [
  [
    { title: "Negrita", Icon: BoldIcon, command: "bold" },
    { title: "Cursiva", Icon: ItalicIcon, command: "italic" },
    { title: "Subrayado", Icon: UnderlineIcon, command: "underline" },
    { title: "Tachado", Icon: StrikethroughIcon, command: "strikeThrough" },
  ],
  [
    { title: "Título 1", Icon: H1Icon, command: "formatBlock", value: "H1" },
    { title: "Título 2", Icon: H2Icon, command: "formatBlock", value: "H2" },
    { title: "Título 3", Icon: H3Icon, command: "formatBlock", value: "H3" },
    { title: "Párrafo normal", Icon: ParagraphIcon, command: "formatBlock", value: "P" },
  ],
  [
    { title: "Lista con viñetas", Icon: BulletListIcon, command: "insertUnorderedList" },
    { title: "Lista numerada", Icon: NumberListIcon, command: "insertOrderedList" },
  ],
  [
    { title: "Alinear a la izquierda", Icon: AlignLeftIcon, command: "justifyLeft" },
    { title: "Centrar", Icon: AlignCenterIcon, command: "justifyCenter" },
    { title: "Alinear a la derecha", Icon: AlignRightIcon, command: "justifyRight" },
    { title: "Justificar", Icon: AlignJustifyIcon, command: "justifyFull" },
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
  // Inline link popover instead of window.prompt() -- a modal prompt can
  // lose/collapse the page's text selection in some browsers between
  // opening it and confirming it, which was exactly the client's report
  // ("intento poner un enlace en una palabra y no me lo permite"). This
  // popover reuses the same saveSelection/restoreSelection pair already
  // used for the color/font controls, so the selected word survives it.
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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

  function openLinkPopover() {
    saveSelection();
    setLinkUrl("");
    setLinkPopoverOpen(true);
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (url) execWithRestoredSelection("createLink", url);
    setLinkPopoverOpen(false);
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
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-t-md border border-b-0 border-slate-300 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
        {TOOLBAR_GROUPS.map((group, gi) => (
          <div key={gi} className="flex gap-0.5 border-r border-slate-300 pr-2 last:border-r-0 dark:border-slate-700">
            {group.map((t) => (
              <button
                key={t.title}
                type="button"
                title={t.title}
                aria-label={t.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec(t.command, t.value)}
                className="rounded p-1.5 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <t.Icon />
              </button>
            ))}
          </div>
        ))}

        <div className="flex items-center gap-2 border-r border-slate-300 pr-2 dark:border-slate-700">
          <div className="relative">
            <button
              type="button"
              title="Enlace"
              aria-label="Enlace"
              onMouseDown={(e) => e.preventDefault()}
              onClick={openLinkPopover}
              className="rounded p-1.5 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <LinkIcon />
            </button>
            {linkPopoverOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 flex w-64 gap-1 rounded-md border border-slate-300 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <input
                  autoFocus
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    } else if (e.key === "Escape") {
                      setLinkPopoverOpen(false);
                    }
                  }}
                  placeholder="https://..."
                  className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={applyLink}
                  className="rounded bg-violet-700 px-2 py-1 text-xs font-medium text-white hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            title="Insertar imagen"
            aria-label="Insertar imagen"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => setImagePickerOpen((v) => !v)}
            className="rounded p-1.5 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <ImageIcon />
          </button>
        </div>

        {/*
          Only shown once an already-inserted image is clicked -- lets
          the user change where text wraps around it (or center it)
          after the fact, not just at insert time.
        */}
        {selectedImg && (
          <div className="flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-1 dark:border-violet-800 dark:bg-violet-950">
            <span className="text-xs text-violet-700 dark:text-violet-300">Imagen:</span>
            {(
              [
                { align: "left" as const, Icon: AlignLeftIcon, title: "Imagen a la izquierda" },
                { align: "center" as const, Icon: AlignCenterIcon, title: "Imagen centrada" },
                { align: "right" as const, Icon: AlignRightIcon, title: "Imagen a la derecha" },
              ]
            ).map(({ align, Icon, title }) => (
              <button
                key={align}
                type="button"
                title={title}
                aria-label={title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => alignSelectedImage(align)}
                className="rounded p-1 text-violet-700 hover:bg-violet-200 dark:text-violet-300 dark:hover:bg-violet-900"
              >
                <Icon />
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
          className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
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
          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          title="Color de texto"
        >
          <input
            type="color"
            onMouseDown={saveSelection}
            onChange={(e) => execWithRestoredSelection("foreColor", e.target.value)}
            className="h-5 w-5 cursor-pointer border-0 p-0"
          />
        </label>
      </div>
      {imagePickerOpen && (
        <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <MediaUploadForm onUploaded={(m) => insertImage(m.url)} />
          <div className="mt-3">
            <MediaGrid items={mediaLibrary} onSelect={(m) => insertImage(m.url)} />
          </div>
        </div>
      )}
      {/*
        Deliberately NOT dark-themed, even inside dark mode -- this canvas
        IS the public page's own light background (see the comment on
        `className` below: "lo que escribes aquí es exactamente cómo se ve
        la página real"). The public site stays light-only by her own
        scope choice, so flipping this box dark would make it stop
        matching what actually publishes -- like a document editor keeping
        the "paper" white while its own chrome goes dark.
      */}
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
