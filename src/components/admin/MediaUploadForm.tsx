"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { uploadMedia, type UploadState } from "@/lib/actions/media";

const initialState: UploadState = {};

// This used to render its own <form>, but every call site (ImageBlockEditor,
// BackgroundPicker) is itself nested inside the page/post editor's outer
// <form>. Nested <form> elements are invalid HTML -- browsers/React don't
// create the inner form at all, so its "Subir imagen" button ended up
// submitting the OUTER form instead (confirmed via React's own console
// warnings: "<form> cannot contain a nested form" / "A React form was
// unexpectedly submitted"). The upload silently never happened.
//
// Fix: no inner <form> -- these inputs are just part of the outer form now,
// and the button uses `formAction` (a native HTML mechanism: a submit
// button can target a different action/handler than its enclosing form).
// Since multiple of these can be open at once (one per image block), the
// button also carries a unique id as its own name/value pair -- the one
// HTML guarantees gets included in the submission, identifying exactly
// which button was clicked -- so uploadMedia knows which of the (now
// uniquely-named, to avoid colliding in the same big FormData) file/altText
// fields belongs to this instance.
export function MediaUploadForm({
  onUploaded,
  accept = "image/*",
  label = "Subir imagen",
}: {
  onUploaded?: (media: { id: string; url: string }) => void;
  // "video/mp4,video/webm" for the section background's Video tab -- see
  // BackgroundPicker.tsx. Defaults to images, unchanged everywhere else.
  accept?: string;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(uploadMedia, initialState);
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.media) {
      onUploaded?.(state.media);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (altInputRef.current) altInputRef.current.value = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.media]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Archivo</label>
        <input ref={fileInputRef} type="file" name={`file-${fieldId}`} accept={accept} required className="mt-1 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Texto alternativo</label>
        <input
          ref={altInputRef}
          name={`altText-${fieldId}`}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          placeholder="Describe la imagen"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        formAction={formAction}
        disabled={pending}
        className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Subiendo..." : label}
      </button>
    </div>
  );
}
