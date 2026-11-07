/**
 * Kept in a plain helper (not inline in a component) on purpose: calling
 * Date.now()/new Date() directly inside a Server Component body trips
 * React's purity lint rule, even though a fresh timestamp per request is
 * exactly what a "last N days" query needs.
 */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

/**
 * Santo Domingo (America/Santo_Domingo) is UTC-4 all year -- the Dominican
 * Republic has no daylight saving time -- so a fixed offset is exact here.
 * `publishedAt` is stored in UTC and always shown/edited in this zone, so a
 * date reads the same no matter where the server or the browser runs.
 */
const AST_OFFSET_MS = 4 * 3_600_000;
const AST_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** UTC Date -> "YYYY-MM-DDTHH:mm" in Santo Domingo time, for <input type="datetime-local">. */
export function toAstInput(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "";
  return new Date(date.getTime() - AST_OFFSET_MS).toISOString().slice(0, 16);
}

/**
 * "YYYY-MM-DDTHH:mm" typed in Santo Domingo time -> UTC Date.
 * Empty string -> null. Anything malformed or impossible (2020-02-31) throws.
 */
export function fromAstInput(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const m = AST_INPUT.exec(value);
  if (!m) throw new Error("La fecha de publicación no es válida.");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const utc = new Date(Date.UTC(y, mo - 1, d, h, mi) + AST_OFFSET_MS);
  // Round-trip catches overflow such as month 13 or Feb 31.
  if (isNaN(utc.getTime()) || toAstInput(utc) !== value) {
    throw new Error("La fecha de publicación no es válida.");
  }
  return utc;
}

const astDateFormat = new Intl.DateTimeFormat("es", {
  timeZone: "America/Santo_Domingo",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "2 nov 2020", always in Santo Domingo time. */
export function formatAstDate(date: Date | string): string {
  return astDateFormat.format(new Date(date)).replace(/\./g, "");
}

const astDateTimeFormat = new Intl.DateTimeFormat("es", {
  timeZone: "America/Santo_Domingo",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
/** "2 nov 2020, 5:41 p. m.", always in Santo Domingo time. */
export function formatAstDateTime(date: Date | string): string {
  return astDateTimeFormat.format(new Date(date));
}
