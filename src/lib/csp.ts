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
export function buildCsp(nonce: string, opts: { https: boolean; dev: boolean }): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `media-src 'self'`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com`,
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

/** HSTS: tells browsers to use HTTPS only for this domain. Sent only over HTTPS. */
export const HSTS_VALUE = "max-age=15552000; includeSubDomains";
