"use client";

import { useActionState } from "react";
import { requestPasswordReset, type RequestResetState } from "./actions";

const initialState: RequestResetState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.message) {
    return <p className="text-sm text-slate-700">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-700 px-4 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>
    </form>
  );
}
