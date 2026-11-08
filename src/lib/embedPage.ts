import { createHash } from "node:crypto";

/**
 * The tiny script of the widget host page (/embed/linkedin/<id>): it tells the page that frames it how tall
 * the widget is, so the frame grows to show every post instead of cutting them off at a fixed height. It
 * sends only a number. The embed page's CSP allows exactly this script, by its hash.
 */
export const EMBED_HEIGHT_SCRIPT = `(function(){var last=0;function send(){var h=Math.ceil(document.body.getBoundingClientRect().height);if(h&&h!==last){last=h;parent.postMessage({type:"agileology-embed-height",height:h},"*");}}if("ResizeObserver" in window){new ResizeObserver(send).observe(document.body);}window.addEventListener("load",send);send();})();`;

export const EMBED_HEIGHT_SCRIPT_HASH = `'sha256-${createHash("sha256").update(EMBED_HEIGHT_SCRIPT).digest("base64")}'`;
