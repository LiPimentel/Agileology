"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "agileology_cookie_consent";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // localStorage only exists client-side, so this can't be read during the
    // initial (SSR) render — the one-time extra render on mount is expected
    // and harmless for a banner that's hidden by default anyway.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-white/95 p-4 text-sm text-slate-700 shadow-lg backdrop-blur sm:right-28 sm:flex-row">
      <p>
        Usamos cookies para analizar las visitas del sitio. Consulta nuestra{" "}
        <Link href="/privacy-policy" className="underline">
          política de privacidad
        </Link>
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
