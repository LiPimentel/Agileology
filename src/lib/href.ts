/**
 * Editable links (link blocks, menu items) must not carry script-running schemes such as
 * "javascript:" or "data:". Only site-relative paths, http(s), mailto and tel are allowed.
 */
export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (value.startsWith("//") || value.startsWith("/\\")) return false; // protocol-relative: another site
  if (/^[/#?]/.test(value)) return true;
  return /^(https?:|mailto:|tel:)/i.test(value);
}

/** The href to render: the original if safe, otherwise an inert "#". */
export function safeHref(href: string): string {
  return isSafeHref(href) ? href : "#";
}
