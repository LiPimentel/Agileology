/**
 * The site's public address and the "with or without www" rule. Pure (no server imports): used by the
 * proxy, the admin screen and the checks.
 */
export type CanonicalHost = "none" | "apex" | "www";
export const CANONICAL_HOSTS: readonly CanonicalHost[] = ["none", "apex", "www"];

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function isIpOrLocalHost(hostname: string): boolean {
  return hostname === "localhost" || IPV4.test(hostname) || hostname.includes(":") || hostname.endsWith(".local");
}

export type NormalizedUrl = { ok: true; url: string; host: string } | { ok: false; error: string };

/** Accepts "agileologywave.com", "https://agileologywave.com/" ...; returns "https://agileologywave.com" (origin only). */
export function normalizePublicUrl(raw: string): NormalizedUrl {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Escribe la dirección del sitio." };
  if (/\s/.test(text)) return { ok: false, error: "La dirección no puede tener espacios." };
  // No scheme typed: assume https (the only sensible choice for a real domain).
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, error: "No es una dirección válida. Ejemplo: https://agileologywave.com" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, error: "La dirección debe empezar por https:// (o http:// solo para pruebas)." };
  if (u.username || u.password) return { ok: false, error: "La dirección no puede incluir usuario ni contraseña." };
  if (u.search || u.hash || (u.pathname && u.pathname !== "/")) return { ok: false, error: "Escribe solo el dominio, sin ruta ni parámetros (por ejemplo https://agileologywave.com)." };
  const host = u.hostname.toLowerCase();
  if (!isIpOrLocalHost(host) && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
    return { ok: false, error: "El dominio no es válido." };
  }
  return { ok: true, url: `${u.protocol}//${u.host}`, host };
}

const stripPort = (host: string) => host.replace(/:\d+$/, "").toLowerCase();

/**
 * If the visitor reached the site through the "wrong" spelling (www vs. no www) of the official
 * domain, the address to send them to (301); otherwise null. Other hosts (localhost, an IP, admin.)
 * are never redirected.
 */
export function canonicalRedirectTarget(opts: {
  host: string;
  pathname: string;
  search: string;
  publicUrl: string | null | undefined;
  canonicalHost: string | null | undefined;
}): string | null {
  if (!opts.publicUrl || (opts.canonicalHost !== "apex" && opts.canonicalHost !== "www")) return null;
  let official: URL;
  try {
    official = new URL(opts.publicUrl);
  } catch {
    return null;
  }
  if (isIpOrLocalHost(official.hostname)) return null; // "with/without www" means nothing for an IP
  const bare = official.hostname.replace(/^www\./, "");
  const apex = bare;
  const www = `www.${bare}`;
  const wanted = opts.canonicalHost === "www" ? www : apex;
  const requested = stripPort(opts.host);
  if (requested === wanted || (requested !== apex && requested !== www)) return null;
  return `${official.protocol}//${wanted}${official.port ? `:${official.port}` : ""}${opts.pathname}${opts.search}`;
}
