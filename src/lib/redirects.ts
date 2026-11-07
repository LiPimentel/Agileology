import { REDIRECTS } from "@/data/redirects";

/** Accent-, case- and trailing-slash-insensitive form used as the lookup key. */
function normalizePath(path: string): string {
  let p = path;
  try {
    p = decodeURIComponent(path);
  } catch {
    // malformed %-escape: fall back to the raw path (it simply won't match anything)
  }
  p = p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

const BY_SOURCE = new Map(REDIRECTS.map((r) => [normalizePath(r.from), r.to]));

/**
 * Where a request for `pathname` should be 301'd, or null if it needs no redirect.
 * Targets are fixed internal paths from REDIRECTS only; nothing from the request is
 * ever copied into the destination, so this cannot be turned into an open redirect.
 */
export function findRedirect(pathname: string): string | null {
  const to = BY_SOURCE.get(normalizePath(pathname));
  if (!to) return null;
  // Never redirect a path onto itself (e.g. /sobre-mi when the rule is /sobre-mí → /sobre-mi).
  let current = pathname;
  try {
    current = decodeURIComponent(pathname);
  } catch {
    // keep raw
  }
  const bare = current.length > 1 ? current.replace(/\/+$/, "") : current;
  return bare === to ? null : to;
}
