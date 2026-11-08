/**
 * The separate address (origin) that serves third-party widgets such as the Elfsight LinkedIn feed
 * (EMBED_ORIGIN, e.g. https://embed.agileologywave.com). It must be a DIFFERENT origin from the
 * site: the widget's scripts then run there, sandboxed away from the site and the backoffice (they
 * share no cookies or storage). Pure, so scripts/check-embed-origin.ts can test it.
 */
export function parseOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** The configured embed origin, or null when the feature is off or it is the same origin as the site (unsafe). */
export function resolveEmbedOrigin(embedEnv: string | undefined | null, siteEnv: string | undefined | null): string | null {
  const embed = parseOrigin(embedEnv);
  if (!embed) return null;
  const site = parseOrigin(siteEnv);
  if (site && new URL(site).host.replace(/^www\./, "") === new URL(embed).host.replace(/^www\./, "")) return null;
  return embed;
}

/** Origins allowed to frame the embed page: the site's own address, with and without www on https. */
export function embedAncestors(siteEnv: string | undefined | null): string[] {
  const site = parseOrigin(siteEnv);
  if (!site) return [];
  const u = new URL(site);
  const out = [u.origin];
  if (u.protocol === "https:" && u.hostname.includes(".") && !/^\d+(\.\d+){3}$/.test(u.hostname)) {
    const bare = u.hostname.replace(/^www\./, "");
    out.push(`https://${bare}`, `https://www.${bare}`);
  }
  return [...new Set(out)];
}
