"use client";

import { useEffect, useState } from "react";

type FeedbackState = { error?: string; success?: boolean; savedAt?: number };

/**
 * Banner fixed at the top of the screen: green "Guardado" after a successful save (it hides
 * itself after a few seconds), red with the message when the save failed (stays until closed).
 * Pass the `useActionState` state of the form; every new result shows it again. The wrapper is
 * always present so screen readers announce what appears inside it.
 */
export function SaveFeedback({ state, successMessage = "Guardado correctamente." }: { state: FeedbackState; successMessage?: string }) {
  const [dismissed, setDismissed] = useState<FeedbackState | null>(null);
  const isError = Boolean(state.error);
  const isSaved = !isError && (Boolean(state.success) || Boolean(state.savedAt));
  const visible = (isError || isSaved) && dismissed !== state;

  useEffect(() => {
    if (!visible || !isSaved) return;
    const t = window.setTimeout(() => setDismissed(state), 4000);
    return () => window.clearTimeout(t);
  }, [visible, isSaved, state]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      {visible && (
        <div
          role={isError ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-xl items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-white shadow-lg ${isError ? "bg-red-700" : "bg-green-700"}`}
        >
          <span aria-hidden="true">{isError ? "⚠" : "✓"}</span>
          <span>{isError ? state.error : successMessage}</span>
          <button
            type="button"
            onClick={() => setDismissed(state)}
            aria-label="Cerrar aviso"
            className="ml-1 rounded px-1.5 text-white/90 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
