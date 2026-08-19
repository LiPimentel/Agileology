import "server-only";
import sanitizeHtml from "sanitize-html";

/** Sanitizes rich text blocks (RF-08) before storage, preventing stored XSS (RS-06). */
export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h1", "h2", "h3", "h4",
      "ul", "ol", "li", "blockquote", "a", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      p: ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$|^right$|^center$|^justify$/],
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
