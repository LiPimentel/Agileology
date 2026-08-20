"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const body = JSON.stringify({ path: pathname, referrer: document.referrer || null });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/visits", blob)) {
      fetch("/api/visits", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  }, [pathname]);

  return null;
}
