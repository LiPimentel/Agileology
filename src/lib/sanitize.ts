import "server-only";
import sanitizeHtml from "sanitize-html";

/** Sanitizes rich text blocks (RF-08) before storage, preventing stored XSS (RS-06). */
export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h1", "h2", "h3", "h4",
      "ul", "ol", "li", "blockquote", "a", "span", "font", "div",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      p: ["style"],
      // Headings need `style` too -- Justificar (or any alignment) applied
      // directly to an <h1>-<h4> was silently losing that style on save,
      // since only <p>/<span>/<div> allowed it.
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      li: ["style"],
      blockquote: ["style"],
      // contentEditable wraps content in a <div> for some formatBlock/
      // justify operations depending on the selection -- without it
      // allowed, that div (and any text-align it carried, e.g. Justificar)
      // was silently dropped by the sanitizer on save.
      div: ["style"],
      // execCommand('foreColor'/'fontName') normally emits <span
      // style="..."> when styleWithCSS is on (TextBlockEditor forces this),
      // but older/other browsers can still fall back to legacy <font
      // color/face> tags -- allow both so text color/font choices actually
      // survive sanitization instead of being silently stripped.
      font: ["color", "face"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$|^right$|^center$|^justify$/],
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
        "font-family": [/^[a-zA-Z0-9\s,'"-]+$/],
        // execCommand('strikeThrough') with styleWithCSS on emits
        // text-decoration-line (rather than a plain <s> tag) -- without
        // this allowed it was silently stripped on save.
        "text-decoration": [/^(none|underline|overline|line-through)(\s+(none|underline|overline|line-through))*$/],
        "text-decoration-line": [/^(none|underline|overline|line-through)(\s+(none|underline|overline|line-through))*$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}

/** Strips all HTML for plain-text fields (chat/contact submissions) (RS-06). */
export function sanitizePlainText(input: string) {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}
