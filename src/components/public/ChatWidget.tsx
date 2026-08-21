"use client";

import { useActionState, useState } from "react";
import { submitChatMessage, type ChatFormState } from "@/lib/actions/chat";
import { trackClick } from "@/lib/track-click";

const initialState: ChatFormState = {};

export function ChatWidget({
  title,
  buttonLabel,
  placeholder,
  successMessage,
}: {
  title: string;
  buttonLabel: string;
  placeholder: string;
  successMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitChatMessage, initialState);

  return (
    <div className="fixed bottom-5 right-5 left-5 z-40 flex flex-col items-end sm:left-auto">
      {open && (
        // w-80 is fine from `sm:` up, but on a narrow phone (< ~360px) it can
        // overflow past the screen edge -- cap it to the viewport width
        // (minus the fixed left/right margins above) below that.
        <div className="mb-3 w-full max-w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between rounded-t-lg bg-[#1c1140] px-4 py-3 text-white">
            <span className="font-medium">{title}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar chat">
              ✕
            </button>
          </div>
          <div className="p-4">
            {state.success ? (
              <p className="text-sm text-green-700">{successMessage}</p>
            ) : (
              <form action={formAction} className="space-y-3">
                <div className="hidden" aria-hidden>
                  <label htmlFor="chat-company">Empresa</label>
                  <input id="chat-company" name="company" tabIndex={-1} autoComplete="off" />
                </div>
                <input
                  name="visitorName"
                  placeholder="Tu nombre (opcional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name="visitorEmail"
                  type="email"
                  placeholder="Tu email (opcional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  name="message"
                  required
                  rows={3}
                  placeholder={placeholder}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                {state.error && <p className="text-xs text-red-600">{state.error}</p>}
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60"
                >
                  {pending ? "Enviando..." : "Enviar"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            if (!v) trackClick("chat_widget");
            return !v;
          });
        }}
        className="flex items-center gap-2 rounded-full bg-violet-700 px-5 py-3 font-medium text-white shadow-lg hover:bg-violet-800"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
