"use client";

import { useEffect, useRef } from "react";

const TOOLBAR: Array<{ label: string; command: string; value?: string }> = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "U", command: "underline" },
  { label: "H2", command: "formatBlock", value: "H2" },
  { label: "H3", command: "formatBlock", value: "H3" },
  { label: "P", command: "formatBlock", value: "P" },
  { label: "• Lista", command: "insertUnorderedList" },
  { label: "1. Lista", command: "insertOrderedList" },
  { label: "Izq", command: "justifyLeft" },
  { label: "Centro", command: "justifyCenter" },
  { label: "Der", command: "justifyRight" },
];

export function TextBlockEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Uncontrolled on purpose: contentEditable owns the DOM after the first
  // paint. Re-applying `html` on every keystroke would fight the browser's
  // caret position, so we only seed it once.
  useEffect(() => {
    if (!initialized.current && ref.current) {
      ref.current.innerHTML = html;
      initialized.current = true;
    }
  }, [html]);

  function exec(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function addLink() {
    const url = window.prompt("URL del enlace:");
    if (url) exec("createLink", url);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1 rounded-t-md border border-b-0 border-slate-300 bg-slate-50 p-1">
        {TOOLBAR.map((t) => (
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
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
        >
          Enlace
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="prose prose-sm min-h-32 max-w-none rounded-b-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
      />
    </div>
  );
}
