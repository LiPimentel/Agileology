"use client";

/**
 * Fires a "click" analytics event -- same endpoint/table as page views
 * (VisitTracker.tsx), just eventType="click". Used for interactions that
 * don't necessarily produce their own pageview: the chat widget opening,
 * a WhatsApp/phone/social link (external, leaves the site), a CTA button
 * in a link block. "quiero ver... click dentro del sitio" in analytics.
 *
 * Best-effort and fire-and-forget on purpose, same as VisitTracker: never
 * blocks or delays the actual navigation/action the visitor is doing.
 */
export function trackClick(label: string) {
  try {
    const body = JSON.stringify({ path: window.location.pathname, eventType: "click", label });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/visits", blob)) {
      fetch("/api/visits", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // Analytics is never allowed to break the actual click/navigation.
  }
}
