"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadMedia, type UploadState } from "@/lib/actions/media";

const initialState: UploadState = {};

export function MediaUploadForm({ onUploaded }: { onUploaded?: (media: { id: string; url: string }) => void }) {
  const [state, formAction, pending] = useActionState(uploadMedia, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.media) {
      onUploaded?.(state.media);
      formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.media]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Archivo</label>
        <input type="file" name="file" accept="image/*" required className="mt-1 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Texto alternativo</label>
        <input
          name="altText"
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Describe la imagen"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Subiendo..." : "Subir imagen"}
      </button>
    </form>
  );
}
