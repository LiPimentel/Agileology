"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "agileology_cookie_consent";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-white/95 p-4 text-sm text-slate-700 shadow-lg backdrop-blur sm:flex-row">
      <p>
        Usamos cookies para analizar las visitas del sitio. Consulta nuestra{" "}
        <a href="/privacy-policy" className="underline">
          política de privacidad
        </a>
        .
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "1");
          setVisible(false);
        }}
        className="shrink-0 rounded-md bg-violet-700 px-4 py-2 text-white hover:bg-violet-800"
      >
        Entendido
      </button>
    </div>
  );
}
