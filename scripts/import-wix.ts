/**
 * Importer for the Wix blog backups (posts + drafts).
 *
 *   npx tsx scripts/import-wix.ts --dry-run [--source ~/Backups]
 *   npx tsx scripts/import-wix.ts --apply   [--source ~/Backups]
 *
 * - Without --apply it NEVER writes (files or database); it only reads and prints
 *   what it would do. --dry-run is the explicit spelling of that same mode.
 * - Idempotent by slug: a published post that already exists is updated (blocks
 *   rebuilt); a draft that already exists is left untouched so edits made in the
 *   CMS are never overwritten.
 * - Markdown -> HTML (marked) -> sanitize-html with a strict allowlist: no inline
 *   styles, no scripts, only the tags the CMS editor itself understands.
 * - Images are decoded/re-encoded with sharp (a file that is not a real image is
 *   rejected), saved under a UUID name in UPLOAD_DIR and only registered as Media
 *   after confirming the file exists on disk with the expected size.
 */
import "dotenv/config";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify } from "../src/lib/slugify";
import { formatAstDate, toAstInput } from "../src/lib/date";

// ───────────────────────── arguments ─────────────────────────
const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(n);
const opt = (n: string) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : undefined;
};
const APPLY = flag("--apply") && !flag("--dry-run");
const SOURCE = path.resolve((opt("--source") ?? "~/Backups").replace(/^~(?=$|\/)/, os.homedir()));
const ONLY = opt("--only"); // optional: process a single slug (debugging)

const UPLOAD_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DRAFT_PREFIXES = ["1-", "2-", "4-"]; // 3 (vacío) y 5 (prueba) NO se importan

// ───────────────────────── helpers ─────────────────────────
const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s: string) => stripAccents(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#39;|&apos;/g, "'");
}
const htmlToText = (html: string) =>
  decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};
function parseSpanishDate(raw: string | undefined): Date | null {
  const m = raw && /(\d{1,2}) de ([a-záéíóú]+) de (\d{4})/i.exec(raw);
  if (!m) return null;
  const month = MONTHS[stripAccents(m[2]).toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1]), 12, 0, 0));
}

function listMd(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => path.join(dir, f))
    : [];
}

// ───────────────────────── parsing ─────────────────────────
type Source = {
  kind: "published" | "draft";
  site: "scrumtia" | "agileologywave" | "borrador";
  file: string;
  title: string;
  slug: string;
  body: string;
  wixUrl: string | null;
  publishedAt: Date | null;
  lastEdit: Date | null;
  categories: string[];
  coverName: string | null; // file name of the cover image as in Wix
  note: string | null;
  fixes: string[];
};

function kv(line: string): [string, string] | null {
  const i = line.indexOf(":");
  if (i < 1) return null;
  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
}

const mediaNameFromUrl = (u: string | undefined) => {
  if (!u) return null;
  const m = /\/media\/([^/?#]+)/.exec(u);
  return m ? decodeURIComponent(m[1]) : null;
};

function parsePublished(file: string, site: "scrumtia" | "agileologywave"): Source {
  const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const end = raw.indexOf("\n---", 4);
  if (!raw.startsWith("---\n") || end < 0) throw new Error(`${file}: sin front matter`);
  const meta: Record<string, string> = {};
  for (const line of raw.slice(4, end).split("\n")) {
    const p = kv(line);
    if (p) meta[p[0]] = p[1];
  }
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const fixes: string[] = [];
  let title = (meta.titulo ?? "").trim();
  let slug = slugify(meta.slug_sugerido ?? title);
  // Wix titles had a typo ("Loa 12 Principios..."); the editorial table says "Los".
  if (/^Loa /.test(title)) {
    title = title.replace(/^Loa /, "Los ");
    fixes.push("título: «Loa» → «Los»");
  }
  if (slug.startsWith("loa-")) {
    slug = slug.replace(/^loa-/, "los-");
    fixes.push("slug: loa- → los-");
  }
  const dateRaw = meta.fecha_publicacion_iso ?? meta.publicado_utc;
  const publishedAt = dateRaw ? new Date(dateRaw) : null;
  if (!publishedAt || isNaN(publishedAt.getTime())) throw new Error(`${file}: fecha de publicación inválida (${dateRaw})`);
  return {
    kind: "published", site, file, title, slug, body,
    wixUrl: meta.url_wix ?? null,
    publishedAt, lastEdit: meta.ultima_modificacion ? new Date(meta.ultima_modificacion) : null,
    categories: [],
    coverName: mediaNameFromUrl(meta.imagen_portada ?? meta.imagen_portada_wix),
    note: null, fixes,
  };
}

function parseDraft(file: string): Source {
  const lines = readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  const h = /^#\s+(.+)$/.exec(lines[0] ?? "");
  if (!h) throw new Error(`${file}: la primera línea no es «# Título»`);
  const meta: Record<string, string> = {};
  let i = 1;
  while (i < lines.length && lines[i].trim() === "") i++;
  for (; i < lines.length && lines[i].startsWith("- "); i++) {
    const p = kv(lines[i].slice(2));
    if (p) meta[p[0]] = p[1];
  }
  const body = lines.slice(i).join("\n").replace(/^\s*\n/, "");
  const base = path.basename(file, ".md").replace(/^\d+-/, "");
  const cat = (meta["categorías"] ?? "").trim();
  return {
    kind: "draft", site: "borrador", file,
    title: h[1].trim(), slug: slugify(base), body,
    wixUrl: null,
    // fecha_publicacion_programada_wix is deliberately ignored; "nota" never enters the body.
    publishedAt: null,
    lastEdit: parseSpanishDate(meta.ultima_edicion_wix),
    categories: cat && !/^ninguna$/i.test(cat) ? cat.split(",").map((c) => c.trim()).filter(Boolean) : [],
    coverName: null,
    note: meta.nota ?? null,
    fixes: [],
  };
}

// ───────────────────────── Markdown → sanitized HTML ─────────────────────────
const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a"];
const KNOWN_DROPPABLE = new Set(["hr"]); // handled explicitly below

function cleanHtml(html: string, dropped: Set<string>): string {
  let h = html.replace(/<hr\s*\/?>/gi, "<p>----</p>"); // keep the author's separators visible
  // "## **Historia **" → heading without the redundant bold, trimmed
  h = h.replace(/<(h[1-6])>\s*<(strong|b)>([\s\S]*?)<\/\2>\s*<\/\1>/g, "<$1>$3</$1>");
  h = h.replace(/<(h[1-6])>\s+/g, "<$1>").replace(/\s+<\/(h[1-6])>/g, "</$1>");
  h = h.replace(/<(h[1-6])>[\s*]*<\/\1>/g, ""); // headings that are only "** **"
  h = h.replace(/<li>\s*<p>((?:(?!<\/?p>)[\s\S])*?)<\/p>\s*<\/li>/g, "<li>$1</li>"); // tight list items
  h = h.replace(/<(strong|b|em|i)>\s*<\/\1>/g, "").replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/g, "");
  for (const m of h.matchAll(/<([a-z][a-z0-9]*)/gi)) {
    const t = m[1].toLowerCase();
    if (!ALLOWED_TAGS.includes(t) && !["h1", "h5", "h6"].includes(t) && !KNOWN_DROPPABLE.has(t)) dropped.add(t);
  }
  return sanitizeHtml(h, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      h1: "h2", h5: "h4", h6: "h4",
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:\/\//i.test(href);
        const attrs: Record<string, string> = external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };
        return { tagName: "a", attribs: attrs };
      },
    },
  }).trim();
}

type Block = { text: string; html: string; isParagraph: boolean };

function markdownToBlocks(md: string, dropped: Set<string>): Block[] {
  // A line of dashes right under a paragraph would turn it into a heading (setext); force a blank line.
  const src = md
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n(-{3,})[ \t]*(?=\n|$)/g, "$1\n\n$2")
    // Wix exports emphasis with a space inside the markers ("**Historia **", "***Cita ***"), which is
    // not valid emphasis in CommonMark and would show literal asterisks. Move the space outside.
    .replace(/(\*{1,3})([^*\n]*?[^*\s])[ \t]+\1/g, "$1$2$1 ")
    .replace(/(\*{1,3})[ \t]+([^*\n]*?[^*\s])\1/g, " $1$2$1")
    // "palabra**“cita”**" → the opening marker glued to the previous word is not valid either.
    .replace(/(\p{L})\*\*(“[^*\n]+?”)\*\*/gu, "$1 **$2**");
  const tokens = marked.lexer(src, { gfm: true });
  const out: Block[] = [];
  for (const tok of tokens) {
    if (tok.type === "space") continue;
    const rendered = marked.parser(Object.assign([tok], { links: tokens.links }) as unknown as typeof tokens);
    const html = cleanHtml(rendered, dropped);
    if (!html) continue;
    out.push({ text: htmlToText(html), html, isParagraph: tok.type === "paragraph" });
  }
  return out;
}

function makeExcerpt(blocks: Block[]): string | null {
  const p = blocks.find((b) => b.isParagraph && b.text.length > 40);
  if (!p) return null;
  if (p.text.length <= 180) return p.text;
  const cut = p.text.slice(0, 180);
  return cut.slice(0, cut.lastIndexOf(" ") > 100 ? cut.lastIndexOf(" ") : 180) + "…";
}

// ───────────────────────── images ─────────────────────────
type ImgRef = { name: string; abs: string };
type BodyImage = { ref: ImgRef; anchor: string | null };
type ImagePlan = { cover: ImgRef | null; body: BodyImage[]; warnings: string[] };

function findFileLoose(dir: string, wanted: string, ext: string): string | null {
  if (!existsSync(dir)) return null;
  const w = norm(wanted);
  const hit = readdirSync(dir).find((f) => f.endsWith(ext) && norm(f.slice(0, -ext.length).replace(/^post_/, "")) === w);
  return hit ? path.join(dir, hit) : null;
}

function bodyImageAnchors(rawHtml: string, allowed: Set<string>): Array<{ name: string; anchor: string | null }> {
  const start = rawHtml.indexOf('id="viewer-');
  if (start < 0) return [];
  const region = rawHtml.slice(start);
  const re = /<wow-image id="([^"]+)"|<(p|h[1-6]|li)\b[^>]*>([\s\S]*?)<\/\2>/g;
  const out: Array<{ name: string; anchor: string | null }> = [];
  const seen = new Set<string>();
  let last: string | null = null;
  for (const m of region.matchAll(re)) {
    if (m[1]) {
      if (allowed.has(m[1]) && !seen.has(m[1])) {
        seen.add(m[1]);
        out.push({ name: m[1], anchor: last });
      }
    } else {
      const t = htmlToText(m[3]);
      if (t) last = t;
    }
  }
  return out;
}

async function planImages(s: Source): Promise<ImagePlan> {
  const warnings: string[] = [];
  const plan: ImagePlan = { cover: null, body: [], warnings };
  if (s.kind === "draft") return plan;

  const siteRoot = path.join(SOURCE, s.site === "scrumtia" ? "wix-scrumtia" : "wix-agileologywave");
  const last = decodeURIComponent((s.wixUrl ?? "").split("/").pop() ?? "");
  const rawDir = path.join(siteRoot, "raw");
  const rawFile = findFileLoose(rawDir, last, ".html");

  // Which image files belong to this post, and where they live on disk.
  const available = new Map<string, string>();
  const imgJsonPath = path.join(siteRoot, "imagenes.json");
  if (existsSync(imgJsonPath)) {
    const json = JSON.parse(readFileSync(imgJsonPath, "utf8"));
    if (s.site === "scrumtia") {
      const key = Object.keys(json).find((k) => norm(k) === norm(last));
      for (const it of (key ? json[key] : []) as Array<{ archivo: string }>) {
        available.set(it.archivo, path.join(siteRoot, "imagenes", key!, it.archivo));
      }
      if (!key) warnings.push(`imagenes.json no tiene entrada para «${last}»`);
    } else {
      for (const [file, info] of Object.entries(json) as Array<[string, { paginas: string[] }]>) {
        const mine = info.paginas.some((p) => p.startsWith("post_") && norm(p.slice(5)) === norm(last));
        if (mine && !info.paginas.includes("inicio")) available.set(file, path.join(siteRoot, "imagenes", file));
      }
    }
  }

  // The real Wix cover is the page's og:image. The front matter's imagen_portada turned
  // out to be the first image INSIDE the article for the old site, so it is only a fallback.
  const rawHtml = rawFile ? readFileSync(rawFile, "utf8") : "";
  const ogUrl = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(rawHtml)?.[1];
  const coverName = mediaNameFromUrl(ogUrl) ?? s.coverName;
  if (coverName) {
    const abs = available.get(coverName) ?? path.join(siteRoot, "imagenes", coverName);
    plan.cover = { name: coverName, abs };
    if (!ogUrl) warnings.push("portada tomada del front matter (no se halló og:image)");
  } else {
    warnings.push("sin imagen de portada (ni og:image ni front matter)");
  }

  if (rawFile) {
    const anchors = bodyImageAnchors(rawHtml, new Set(available.keys()));
    for (const a of anchors) {
      if (a.name === coverName) continue; // the cover is already shown at the top of the post page
      plan.body.push({ ref: { name: a.name, abs: available.get(a.name)! }, anchor: a.anchor });
    }
  } else {
    warnings.push(`no encontré el HTML original (raw/post_${last}.html); imágenes del cuerpo no ubicadas`);
  }
  return plan;
}

type Prisma = InstanceType<typeof PrismaClient>;

type StoredImage = { url: string; mediaId: string | null; note: string };

const mediaMarker = (name: string) => `Wix: ${name}`;

async function storeImage(prisma: Prisma | null, ref: ImgRef): Promise<StoredImage> {
  const st = await stat(ref.abs).catch(() => null);
  if (!st || !st.isFile()) throw new Error(`archivo no existe: ${ref.abs}`);
  if (st.size > MAX_IMAGE_BYTES) throw new Error(`demasiado grande (${st.size} bytes): ${ref.name}`);

  // Reuse the Media record from a previous run (idempotent) as long as its file is still on disk.
  if (prisma) {
    const prev = await prisma.media.findFirst({ where: { altText: mediaMarker(ref.name) } });
    if (prev && existsSync(path.join(UPLOAD_DIR, prev.filename))) {
      return { url: prev.url, mediaId: prev.id, note: "ya importada" };
    }
  }

  const input = await readFile(ref.abs);
  const img = sharp(input);
  let meta;
  try {
    meta = await img.metadata(); // throws if it is not a real image
  } catch {
    throw new Error(`no es una imagen válida: ${ref.name}`);
  }
  const out = await img.resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const outMeta = await sharp(out).metadata();
  const filename = `${randomUUID()}.webp`;
  const url = `/uploads/${filename}`;

  if (!APPLY || !prisma) return { url, mediaId: null, note: `copiaría ${meta.width}×${meta.height} ${meta.format} → webp` };

  await mkdir(UPLOAD_DIR, { recursive: true });
  const target = path.join(UPLOAD_DIR, filename);
  if (path.dirname(target) !== UPLOAD_DIR) throw new Error("ruta de destino fuera de UPLOAD_DIR");
  await writeFile(target, out);
  const written = await stat(target).catch(() => null);
  if (!written || written.size !== out.length) throw new Error(`no se pudo escribir ${filename} en disco`);

  const data = {
    url, filename, mimeType: "image/webp", size: out.length,
    width: outMeta.width ?? null, height: outMeta.height ?? null, altText: mediaMarker(ref.name),
  };
  const prev = await prisma.media.findFirst({ where: { altText: mediaMarker(ref.name) } });
  const media = prev ? await prisma.media.update({ where: { id: prev.id }, data }) : await prisma.media.create({ data });
  return { url, mediaId: media.id, note: "copiada" };
}

// ───────────────────────── block assembly ─────────────────────────
type OutBlock =
  | { type: "text"; content: { html: string } }
  | { type: "image"; content: { url: string; altText: string; alignment: "center"; shape: "none"; focalX: 50; focalY: 50; zoom: 1; width: 100 } };

function assembleBlocks(
  blocks: Block[],
  images: Array<{ url: string; anchor: string | null; alt: string }>,
  warnings: string[],
): OutBlock[] {
  const blockNorm = blocks.map((b) => norm(b.text));
  const after = new Map<number, typeof images>(); // block index → images placed after it
  let cursor = 0;
  for (const im of images) {
    let idx = -1;
    if (im.anchor) {
      const a = norm(im.anchor);
      const tail = a.slice(-40);
      for (let i = cursor; i < blocks.length; i++) {
        if ((tail.length >= 8 && blockNorm[i].includes(tail)) || (blockNorm[i].length >= 6 && a.includes(blockNorm[i]))) {
          idx = i;
          break;
        }
      }
      if (idx < 0) warnings.push(`imagen sin ubicar (ancla «${im.anchor.slice(0, 50)}…») → al final`);
    }
    if (idx < 0) idx = im.anchor ? blocks.length - 1 : -1;
    cursor = Math.max(cursor, idx);
    after.set(idx, [...(after.get(idx) ?? []), im]);
  }

  const out: OutBlock[] = [];
  const img = (i: { url: string; alt: string }): OutBlock => ({
    type: "image",
    content: { url: i.url, altText: i.alt, alignment: "center", shape: "none", focalX: 50, focalY: 50, zoom: 1, width: 100 },
  });
  for (const i of after.get(-1) ?? []) out.push(img(i));
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) out.push({ type: "text", content: { html: buf.join("\n") } });
    buf = [];
  };
  blocks.forEach((b, i) => {
    buf.push(b.html);
    const here = after.get(i);
    if (here?.length) {
      flush();
      for (const x of here) out.push(img(x));
    }
  });
  flush();
  return out;
}

// ───────────────────────── main ─────────────────────────
type Report = {
  src: Source; blocks: OutBlock[]; excerpt: string | null; cover: StoredImage | null;
  dbAction: string; warnings: string[]; dropped: string[]; imgNotes: string[]; words: number;
};

async function main() {
  const sources: Source[] = [];
  for (const f of listMd(path.join(SOURCE, "wix-scrumtia/posts"))) sources.push(parsePublished(f, "scrumtia"));
  for (const f of listMd(path.join(SOURCE, "wix-agileologywave/posts"))) sources.push(parsePublished(f, "agileologywave"));
  for (const f of listMd(path.join(SOURCE, "wix-borradores"))) {
    if (DRAFT_PREFIXES.some((p) => path.basename(f).startsWith(p))) sources.push(parseDraft(f));
  }

  const selected = ONLY ? sources.filter((s) => s.slug === ONLY) : sources;
  const slugs = new Map<string, string>();
  for (const s of sources) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) throw new Error(`slug inválido (¿tildes?): ${s.slug}`);
    if (slugs.has(s.slug)) throw new Error(`slug duplicado ${s.slug}: ${slugs.get(s.slug)} y ${s.file}`);
    slugs.set(s.slug, s.file);
  }

  console.log(`\n${APPLY ? "MODO APLICAR (escribe en BD y disco)" : "MODO DRY-RUN (no escribe nada)"}`);
  console.log(`Origen: ${SOURCE}\nUPLOAD_DIR: ${UPLOAD_DIR}`);

  // Database (read-only unless --apply).
  let prisma: Prisma | null = null;
  const cs = process.env.DATABASE_URL;
  if (cs) {
    try {
      const u = new URL(cs);
      console.log(`BD: ${u.hostname}:${u.port || "5432"}${u.pathname}`);
      const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: cs, connectionTimeoutMillis: 4000 }) });
      await Promise.race([
        client.$queryRaw`select 1`,
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
      ]);
      prisma = client;
    } catch (e) {
      console.log(`BD: NO accesible (${e instanceof Error ? e.message : e}). Se sigue sin consultar existentes.`);
    }
  } else {
    console.log("BD: DATABASE_URL no está definida.");
  }
  if (APPLY && !prisma) throw new Error("--apply requiere una base de datos accesible.");

  const reports: Report[] = [];
  for (const s of selected) {
    const warnings: string[] = [...s.fixes.map((f) => `corregido ${f}`)];
    const dropped = new Set<string>();
    const blocks = markdownToBlocks(s.body, dropped);
    if (blocks.length === 0) throw new Error(`${s.file}: el cuerpo quedó vacío`);

    const plan = await planImages(s);
    warnings.push(...plan.warnings);
    const imgNotes: string[] = [];

    let cover: StoredImage | null = null;
    if (plan.cover) {
      try {
        cover = await storeImage(prisma, plan.cover);
        imgNotes.push(`portada ${plan.cover.name}: ${cover.note}`);
      } catch (e) {
        warnings.push(`portada omitida: ${e instanceof Error ? e.message : e}`);
      }
    }
    const bodyImgs: Array<{ url: string; anchor: string | null; alt: string }> = [];
    for (const b of plan.body) {
      try {
        const st = await storeImage(prisma, b.ref);
        bodyImgs.push({ url: st.url, anchor: b.anchor, alt: `Imagen ${bodyImgs.length + 1} de «${s.title}»` });
        imgNotes.push(`cuerpo ${b.ref.name}: ${st.note}`);
      } catch (e) {
        warnings.push(`imagen omitida: ${e instanceof Error ? e.message : e}`);
      }
    }

    const outBlocks = assembleBlocks(blocks, bodyImgs, warnings);
    const allHtml = outBlocks.filter((b) => b.type === "text").map((b) => (b.content as { html: string }).html).join("\n");
    if (/style\s*=|<script|wixstatic|<iframe|\son\w+\s*=/i.test(allHtml)) {
      throw new Error(`${s.slug}: el HTML sanitizado aún contiene estilos/scripts/URLs de Wix`);
    }
    if (/\*\*/.test(htmlToText(allHtml))) warnings.push(`quedan «**» sueltos en el texto (${(htmlToText(allHtml).match(/\*\*/g) ?? []).length})`);
    if (s.kind === "draft" && s.note && allHtml.includes(s.note.slice(0, 30))) {
      throw new Error(`${s.slug}: la «nota:» se coló en el cuerpo`);
    }

    let dbAction = "desconocido (sin BD)";
    if (prisma) {
      const ex = await prisma.post.findUnique({ where: { slug: s.slug }, select: { id: true, status: true } });
      dbAction = !ex ? "CREAR" : s.kind === "draft" ? "OMITIR (ya existe; no se toca)" : `ACTUALIZAR (existe, ${ex.status})`;
    }

    reports.push({
      src: s, blocks: outBlocks, excerpt: makeExcerpt(blocks), cover, dbAction, warnings,
      dropped: [...dropped], imgNotes, words: htmlToText(allHtml).split(/\s+/).length,
    });
  }

  // ── report ──
  console.log("\n" + "═".repeat(100));
  for (const r of reports) {
    const s = r.src;
    const nText = r.blocks.filter((b) => b.type === "text").length;
    const nImg = r.blocks.filter((b) => b.type === "image").length;
    console.log(`\n▸ ${s.slug}   [${s.kind === "draft" ? "BORRADOR" : "publicado"}]  → ${r.dbAction}`);
    console.log(`  título:     ${s.title}`);
    if (s.publishedAt) console.log(`  publishedAt: ${s.publishedAt.toISOString()}  (${toAstInput(s.publishedAt).replace("T", " ")} AST → «${formatAstDate(s.publishedAt)}»)  createdAt = igual`);
    else console.log(`  publishedAt: null   publishAt: null   updatedAt: ${s.lastEdit?.toISOString() ?? "(ahora)"}   createdAt: (ahora)`);
    console.log(`  tags:       ${s.categories.join(", ") || "—"}   palabras: ~${r.words}   bloques: ${nText} texto + ${nImg} imagen`);
    console.log(`  featured:   ${r.cover ? r.cover.url : "—"}`);
    console.log(`  extracto:   ${r.excerpt ?? "—"}`);
    for (const n of r.imgNotes) console.log(`  imagen:     ${n}`);
    if (r.dropped.length) console.log(`  ⚠ etiquetas no permitidas descartadas: ${r.dropped.join(", ")}`);
    for (const w of r.warnings) console.log(`  ⚠ ${w}`);
  }

  if (flag("--show")) {
    for (const r of reports) {
      console.log(`\n──── ${r.src.slug} ────`);
      for (const b of r.blocks) console.log(b.type === "text" ? b.content.html : `[IMAGEN ${b.content.url} · ${b.content.altText}]`);
    }
  }

  const pub = reports.filter((r) => r.src.kind === "published");
  const dr = reports.filter((r) => r.src.kind === "draft");
  console.log("\n" + "═".repeat(100));
  console.log(`Resumen: ${pub.length} publicados + ${dr.length} borradores = ${reports.length}`);
  console.log(`  con advertencias: ${reports.filter((r) => r.warnings.some((w) => !w.startsWith("corregido"))).length}`);
  if (!ONLY && (pub.length !== 17 || dr.length !== 3)) console.log("  ⚠ se esperaban 17 publicados y 3 borradores");
  console.log("\nRedirecciones que se derivan (URL de Wix → nueva):");
  for (const r of pub) console.log(`  ${r.src.wixUrl}  →  /blog/${r.src.slug}`);

  if (!APPLY) {
    console.log("\nDry-run terminado: no se escribió nada.");
    await prisma?.$disconnect();
    return;
  }

  // ── apply ──
  for (const r of reports) {
    const s = r.src;
    const db = prisma!;
    const existing = await db.post.findUnique({ where: { slug: s.slug } });
    if (existing && s.kind === "draft") {
      console.log(`omitido (borrador ya existe): ${s.slug}`);
      continue;
    }
    const featuredImage = r.cover?.url ?? existing?.featuredImage ?? null;
    await db.$transaction(async (tx) => {
      const common = {
        title: s.title,
        featuredImage,
        excerpt: existing?.excerpt ?? r.excerpt,
        publishAt: null,
      };
      let post;
      if (s.kind === "published") {
        const data = { ...common, status: "published" as const, publishedAt: s.publishedAt!, createdAt: s.publishedAt! };
        post = existing
          ? await tx.post.update({ where: { id: existing.id }, data })
          : await tx.post.create({ data: { ...data, slug: s.slug, tags: [] } });
      } else {
        post = await tx.post.create({
          data: { ...common, slug: s.slug, status: "draft", publishedAt: null, tags: s.categories, ...(s.lastEdit ? { updatedAt: s.lastEdit } : {}) },
        });
      }
      await tx.contentBlock.deleteMany({ where: { postId: post.id } });
      const created = [];
      for (const [i, b] of r.blocks.entries()) {
        created.push(await tx.contentBlock.create({ data: { postId: post.id, type: b.type, content: b.content as object, position: i } }));
      }
      if (s.kind === "published") {
        const snapshot = {
          id: post.id, title: post.title, excerpt: post.excerpt, featuredImage: post.featuredImage, tags: post.tags,
          blocks: created.map((c) => ({ id: c.id, type: c.type, content: c.content })),
        };
        const latest = await tx.postVersion.findFirst({ where: { postId: post.id }, orderBy: { createdAt: "desc" } });
        // jsonb does not preserve key order, so compare a canonical (sorted-key) form of the content only.
        const canon = (v: unknown): unknown =>
          Array.isArray(v)
            ? v.map(canon)
            : v && typeof v === "object"
              ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)]))
              : v;
        const strip = (x: { title: unknown; excerpt: unknown; featuredImage: unknown; tags: unknown; blocks: Array<{ type: string; content: unknown }> }) =>
          JSON.stringify(canon({ title: x.title, excerpt: x.excerpt, featuredImage: x.featuredImage, tags: x.tags, blocks: x.blocks.map((b) => ({ type: b.type, content: b.content })) }));
        if (!latest || strip(latest.snapshot as typeof snapshot) !== strip(snapshot)) {
          await tx.postVersion.create({ data: { postId: post.id, snapshot: snapshot as object } });
        }
      }
    });
    console.log(`${existing ? "actualizado" : "creado"}: ${s.slug}`);
  }
  await prisma?.$disconnect();
  console.log("\nImportación terminada.");
}

main().catch((e) => {
  console.error("\nERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
