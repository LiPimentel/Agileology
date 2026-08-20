"use client";

import { useActionState } from "react";
import { updateCommunicationSettings, type CommsState } from "./actions";

const initialState: CommsState = {};
const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600";

export function CommunicationsForm({
  chatEmail,
  contactEmail,
  chatWidgetTitle,
  chatWidgetButtonLabel,
  chatWidgetPlaceholder,
  chatWidgetSuccessMessage,
}: {
  chatEmail: string;
  contactEmail: string;
  chatWidgetTitle: string;
  chatWidgetButtonLabel: string;
  chatWidgetPlaceholder: string;
  chatWidgetSuccessMessage: string;
}) {
  const [state, formAction, pending] = useActionState(updateCommunicationSettings, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700">Email destino del chat del sitio</label>
        <input type="email" name="chatDestinationEmail" defaultValue={chatEmail} required className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Email destino del formulario de contacto</label>
        <input type="email" name="contactFormDestinationEmail" defaultValue={contactEmail} required className={inputClass} />
      </div>

      <fieldset className="space-y-3 rounded-md border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Textos del widget de chat</legend>
        <div>
          <label className="block text-xs font-medium text-slate-500">Texto del botón flotante</label>
          <input name="chatWidgetButtonLabel" defaultValue={chatWidgetButtonLabel} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Título arriba del chat</label>
          <input name="chatWidgetTitle" defaultValue={chatWidgetTitle} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Placeholder del campo de mensaje</label>
          <input name="chatWidgetPlaceholder" defaultValue={chatWidgetPlaceholder} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Mensaje después de enviar</label>
          <input name="chatWidgetSuccessMessage" defaultValue={chatWidgetSuccessMessage} required className={inputClass} />
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Guardado.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
