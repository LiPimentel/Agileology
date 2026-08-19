"use client";

import { useActionState } from "react";
import { verifyLoginTwoFactor, type TwoFactorState } from "../actions";

const initialState: TwoFactorState = {};

export function TwoFactorForm() {
  const [state, formAction, pending] = useActionState(verifyLoginTwoFactor, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="token" className="block text-sm font-medium text-slate-700">
          Código de 6 dígitos
        </label>
        <input
          id="token"
          name="token"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-700 px-4 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {pending ? "Verificando..." : "Verificar"}
      </button>
    </form>
  );
}
