/** Sanity checks for the carousel block's validation (run: npx tsx scripts/check-carousel-schema.ts). */
import Module from "node:module";

// "server-only" only resolves inside Next; stub it so the validators can run from a script.
type Loader = { _load: (request: string, ...rest: unknown[]) => unknown };
const loader = Module as unknown as Loader;
const realLoad = loader._load;
loader._load = function (request: string, ...rest: unknown[]) {
  return request === "server-only" ? {} : realLoad.call(this, request, ...rest);
};

async function main() {
const { sanitizeBlockContent } = await import("../src/lib/blocks");

const ok = (c: unknown) => { sanitizeBlockContent("carousel", c); };
const bad = (name: string, c: unknown) => {
  try { sanitizeBlockContent("carousel", c); console.log(`✘ ${name}: se aceptó y no debía`); process.exitCode = 1; }
  catch { console.log(`✔ rechaza: ${name}`); }
};
ok({ slides: [{ kind: "image", url: "/uploads/a.webp", altText: "x" }, { kind: "video", url: "https://youtu.be/dQw4w9WgXcQ" }] });
console.log("✔ acepta: imagen + video de YouTube");
ok({});
console.log("✔ acepta: carrusel vacío con valores por defecto");
const out = sanitizeBlockContent("carousel", { slides: [{ kind: "image", url: "/uploads/u.webp", altText: "<b>hola</b>" }] }) as { slides: { altText: string }[] };
console.log(out.slides[0].altText.includes("<") ? "✘ el alt conserva HTML" : "✔ limpia HTML del texto alternativo");
bad("imagen javascript:", { slides: [{ kind: "image", url: "javascript:alert(1)", altText: "" }] });
bad("imagen data:", { slides: [{ kind: "image", url: "data:text/html,<script>", altText: "" }] });
bad("imagen protocolo relativo", { slides: [{ kind: "image", url: "//evil.com/a.png", altText: "" }] });
bad("video que no es YouTube/Vimeo", { slides: [{ kind: "video", url: "https://evil.com/v.mp4" }] });
bad("imagen con tabulación escondida", { slides: [{ kind: "image", url: "/\t/evil.com/a.png", altText: "" }] });
bad("imagen http (no https)", { slides: [{ kind: "image", url: "http://x.com/a.png", altText: "" }] });
bad("imagen fuera de /uploads", { slides: [{ kind: "image", url: "/admin/x.png", altText: "" }] });
bad("YouTube escondido en otra URL", { slides: [{ kind: "video", url: "https://evil.com/?x=youtube.com/watch?v=AAAAAAAAAAA" }] });
bad("URL de más de 2048 caracteres", { slides: [{ kind: "image", url: "https://x.com/" + "a".repeat(2100), altText: "" }] });
bad("descripción de más de 300 caracteres", { slides: [{ kind: "image", url: "/uploads/a.webp", altText: "a".repeat(301) }] });
bad("más de 20 diapositivas", { slides: Array.from({ length: 21 }, () => ({ kind: "image", url: "/uploads/a.webp", altText: "" })) });
bad("intervalo fuera de rango", { slides: [], intervalSeconds: 1 });
bad("tipo de diapositiva desconocido", { slides: [{ kind: "html", url: "/a" }] });
}
main();
