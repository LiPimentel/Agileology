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
ok({ shape: "oval", slides: [{ kind: "image", url: "/uploads/a.webp", altText: "x", fit: "contain", focalX: 20, focalY: 80, zoom: 2.5 }] });
console.log("✔ acepta: forma óvalo y ajuste por imagen");
const framed = sanitizeBlockContent("carousel", { slides: [{ kind: "image", url: "/uploads/a.webp" }] }) as { shape: string; slides: { fit: string; focalX: number; zoom: number }[] };
console.log(framed.shape === "none" && framed.slides[0].fit === "cover" && framed.slides[0].focalX === 50 && framed.slides[0].zoom === 1 ? "✔ valores por defecto del encuadre" : "✘ valores por defecto incorrectos");
bad("zoom mayor que 3", { slides: [{ kind: "image", url: "/uploads/a.webp", zoom: 5 }] });
bad("posición fuera de 0-100", { slides: [{ kind: "image", url: "/uploads/a.webp", focalX: 150 }] });
bad("ajuste desconocido", { slides: [{ kind: "image", url: "/uploads/a.webp", fit: "stretch" }] });
bad("forma desconocida", { shape: "star", slides: [] });
const lp = sanitizeBlockContent("latestPosts", {}) as { count: number; autoplay: boolean; author: string };
console.log(lp.count === 5 && lp.autoplay === true && lp.author === "Lissette Pimentel Sosa" ? "✔ entradas recientes: valores por defecto (5, rotando)" : "✘ valores por defecto de entradas recientes");
const lpBad = (name: string, c: unknown) => { try { sanitizeBlockContent("latestPosts", c); console.log(`✘ ${name}: se aceptó`); process.exitCode = 1; } catch { console.log(`✔ rechaza (entradas recientes): ${name}`); } };
lpBad("menos de 3 entradas", { count: 2 });
lpBad("más de 5 entradas", { count: 6 });
lpBad("intervalo fuera de rango", { intervalSeconds: 1 });
lpBad("nombre de más de 80 caracteres", { author: "a".repeat(81) });
const lpHtml = sanitizeBlockContent("latestPosts", { author: "<b>Ana</b>" }) as { author: string };
console.log(lpHtml.author.includes("<") ? "✘ el nombre conserva HTML" : "✔ limpia HTML del nombre");
const vOk = (name: string, url: string) => { try { sanitizeBlockContent("video", { url }); console.log(`✔ video acepta: ${name}`); } catch { console.log(`✘ video rechazó: ${name}`); process.exitCode = 1; } };
const vBad = (name: string, url: string) => { try { sanitizeBlockContent("video", { url }); console.log(`✘ video aceptó: ${name}`); process.exitCode = 1; } catch { console.log(`✔ video rechaza: ${name}`); } };
vOk("archivo subido .mp4", "/uploads/35959439-2ff7-4c9b-9d6b-b2280064d0b4.mp4");
vOk("archivo subido .webm", "/uploads/abc-123.webm");
vOk("enlace de YouTube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
vOk("bloque vacío", "");
vBad("mp4 de otro sitio", "https://evil.com/v.mp4");
vBad("ruta con ..", "/uploads/../x.mp4");
vBad("fuera de /uploads", "/admin/x.mp4");
vBad("javascript:", "javascript:alert(1)");
vBad("subcarpeta de uploads", "/uploads/a/b.mp4");
const imgOk = (name: string, c: object) => { try { const r = sanitizeBlockContent("image", { url: "/uploads/a.webp", altText: "x", alignment: "center", shape: "none", focalX: 50, focalY: 50, zoom: 1, width: 100, ...c }) as { frame: string }; console.log(`✔ imagen acepta: ${name} (frame=${r.frame})`); } catch { console.log(`✘ imagen rechazó: ${name}`); process.exitCode = 1; } };
const imgBad = (name: string, c: object) => { try { sanitizeBlockContent("image", { url: "/uploads/a.webp", altText: "x", alignment: "center", shape: "none", focalX: 50, focalY: 50, zoom: 1, width: 100, ...c }); console.log(`✘ imagen aceptó: ${name}`); process.exitCode = 1; } catch { console.log(`✔ imagen rechaza: ${name}`); } };
imgOk("sin marco (imágenes antiguas)", {});
imgOk("marco panorámico con posición y zoom", { frame: "16/9", focalX: 20, focalY: 80, zoom: 2.2 });
imgBad("marco inventado", { frame: "5/4" });
imgBad("posición fuera de 0-100", { frame: "1/1", focalX: 140 });
const li = (name: string, c: unknown, ok: boolean) => { let accepted = true; try { sanitizeBlockContent("linkedinPosts", c); } catch { accepted = false; } console.log(`${accepted === ok ? "✔" : "✘"} linkedin ${ok ? "acepta" : "rechaza"}: ${name}`); if (accepted !== ok) process.exitCode = 1; };
const post = (o: object = {}) => ({ url: "https://www.linkedin.com/posts/lissette_abc-123", text: "Hola", date: "2026-11-01", image: "", ...o });
li("bloque vacío (valores por defecto)", {}, true);
li("5 publicaciones válidas", { posts: Array.from({ length: 5 }, () => post()) }, true);
li("6 publicaciones", { posts: Array.from({ length: 6 }, () => post()) }, false);
li("enlace lnkd.in", { posts: [post({ url: "https://lnkd.in/abc" })] }, true);
li("enlace de otro sitio", { posts: [post({ url: "https://evil.example/linkedin.com/x" })] }, false);
li("linkedin.com como subdominio falso", { posts: [post({ url: "https://linkedin.com.evil.example/x" })] }, false);
li("javascript:", { posts: [post({ url: "javascript:alert(1)" })] }, false);
li("http sin cifrar", { posts: [post({ url: "http://www.linkedin.com/posts/x" })] }, false);
li("fecha mal formada", { posts: [post({ date: "01/11/2026" })] }, false);
li("imagen javascript:", { posts: [post({ image: "javascript:alert(1)" })] }, false);
li("visible fuera de rango", { visible: 9 }, false);
bad("más de 20 diapositivas", { slides: Array.from({ length: 21 }, () => ({ kind: "image", url: "/uploads/a.webp", altText: "" })) });
bad("intervalo fuera de rango", { slides: [], intervalSeconds: 1 });
bad("tipo de diapositiva desconocido", { slides: [{ kind: "html", url: "/a" }] });
}
main();
