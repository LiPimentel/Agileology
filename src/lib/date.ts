/**
 * Kept in a plain helper (not inline in a component) on purpose: calling
 * Date.now()/new Date() directly inside a Server Component body trips
 * React's purity lint rule, even though a fresh timestamp per request is
 * exactly what a "last N days" query needs.
 */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
