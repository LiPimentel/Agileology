/** Helpers shared by the admin list screens (filters, sorting, pagination). Server/client safe. */

export const PAGE_SIZE = 25;

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a query parameter, trimmed. */
export function pick(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function validDay(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const dt = new Date(`${d}T00:00:00Z`);
  return !isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === d;
}

// Days are Santo Domingo days (UTC-4, no daylight saving), the same clock the rest of the admin shows.
export const astDayStart = (d: string): Date | null => (validDay(d) ? new Date(`${d}T00:00:00-04:00`) : null);
export const astDayEnd = (d: string): Date | null => (validDay(d) ? new Date(`${d}T23:59:59.999-04:00`) : null);

/** Prisma date filter for an inclusive from/to day range, or undefined when neither is set/valid. */
export function dayRange(from: string, to: string) {
  const gte = astDayStart(from);
  const lte = astDayEnd(to);
  return gte || lte ? { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } : undefined;
}

export function pageNumber(v: string | string[] | undefined): number {
  const n = parseInt(pick(v) || "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 1;
}

/** `value` if it is one of `allowed`, otherwise `fallback`. */
export function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Query string from the non-empty entries (optionally overriding some). */
export function buildQuery(params: Record<string, string | undefined>, overrides: Record<string, string | undefined> = {}): string {
  const merged = { ...params, ...overrides };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}
