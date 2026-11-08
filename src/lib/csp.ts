/**
 * Content-Security-Policy for every page (set per request in proxy.ts, with a fresh nonce).
 *
 * What the site really loads from outside itself, and so what is allowed:
 *  - Google Fonts: stylesheet (fonts.googleapis.com) and font files (fonts.gstatic.com)
 *  - video embeds: YouTube (privacy mode) and Vimeo; the contact map: Google Maps
 *  - images may come from any https site (an editor can paste one); everything else is "self"
 * Scripts run only if they carry this request's nonce, so injected HTML cannot execute code.
 * Inline style *attributes* are allowed (the editor and carousels use them); inline <style>
 * elements and external stylesheets are not, apart from Google Fonts.
 */
export function buildCsp(nonce: string, opts: { https: boolean; dev: boolean; embedOrigin?: string | null }): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `media-src 'self'`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com/maps/${opts.embedOrigin ? ` ${opts.embedOrigin}` : ""}`,
    `connect-src 'self'${opts.dev ? " ws: wss:" : ""}`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  // Only over HTTPS: on plain HTTP (local testing) it would make the browser rewrite every
  // request to https:// and break the site.
  if (opts.https) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/**
 * CSP for /embed/* only: the tiny page that hosts a third-party widget (Elfsight) so that its
 * scripts never run in the site's own pages. It is served from its own origin (EMBED_ORIGIN, see
 * lib/embedOrigin.ts) and may be framed only by this site, so the widget shares no cookies or storage
 * with the site or the backoffice.
 */
export function buildEmbedCsp(opts: { https: boolean; ancestors: string[] }): string {
  const directives = [
    `default-src 'none'`,
    `script-src https://static.elfsight.com https://*.elfsight.com https://*.elfsightcdn.com`,
    `style-src 'unsafe-inline' https:`,
    `img-src https: data: blob:`,
    `font-src https: data:`,
    `media-src https:`,
    `connect-src https://*.elfsight.com https://*.elfsightcdn.com`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'none'`,
    `frame-ancestors ${opts.ancestors.length ? opts.ancestors.join(" ") : "'none'"}`,
  ];
  if (opts.https) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** HSTS: tells browsers to use HTTPS only for this domain. Sent only over HTTPS. */
export const HSTS_VALUE = "max-age=15552000; includeSubDomains";
