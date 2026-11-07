/**
 * Prepares the content of `inicio` and `contacto` so they match agileologywave.com (Wix).
 *
 *   npx tsx scripts/update-wix-home.ts            # dry-run (default): prints, writes nothing
 *   npx tsx scripts/update-wix-home.ts --apply    # writes the working blocks + uploads images
 *
 * Safety rules:
 * - Writes ONLY the working (draft) blocks of the page. It does not create a PageVersion and
 *   does not touch `status`, so what the public sees does not change until the author
 *   publishes from the admin (the public site reads the last published snapshot).
 * - Refuses to touch a page that already has blocks, so nothing the author built is overwritten.
 * - Does not change backgrounds, banner, menu, theme or any other page.
 * - Images are decoded and re-encoded with sharp (a non-image is rejected), saved under a UUID
 *   name in UPLOAD_DIR, and a Media row is created only after the file is verified on disk.
 *
 * Sources: ~/Backups/wix-agileologywave (CONTENIDO.md, raw/*.html, imagenes/).
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import sanitizeHtml from "sanitize-html";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply") && !argv.includes("--dry-run");
const srcIdx = argv.indexOf("--source");
const SOURCE = path.resolve((srcIdx >= 0 ? argv[srcIdx + 1] : "~/Backups").replace(/^~(?=$|\/)/, os.homedir()));
const IMG_DIR = path.join(SOURCE, "wix-agileologywave", "imagenes");
const UPLOAD_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024;

const clean = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "h2", "h3", "ul", "li", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
  }).trim();

// ── block builders ──
type Col = { position: number; columnIndex: number; columnWidth: number; blockOrder: number };
type Planned = Col & { type: "text" | "image" | "link" | "contactForm"; content: Record<string, unknown>; label: string };

const text = (c: Col, html: string): Planned => ({ ...c, type: "text", content: { html: clean(html) }, label: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 70) });
const image = (c: Col, url: string, alt: string, label: string): Planned => ({
  ...c, type: "image", label,
  content: { url, altText: alt, alignment: "center", shape: "none", focalX: 50, focalY: 50, zoom: 1, width: 100 },
});
const link = (c: Col, label: string, href: string): Planned => ({ ...c, type: "link", content: { label, href, internal: true, newTab: false }, label: `${label} → ${href}` });
const col = (position: number, columnIndex = 0, columnWidth = 100, blockOrder = 0): Col => ({ position, columnIndex, columnWidth, blockOrder });

// ── image upload ──
type Prisma = InstanceType<typeof PrismaClient>;
const marker = (name: string) => `Wix: ${name}`;

async function storeImage(prisma: Prisma, name: string): Promise<{ url: string; note: string }> {
  const abs = path.join(IMG_DIR, name);
  const st = await stat(abs).catch(() => null);
  if (!st || !st.isFile()) throw new Error(`archivo no existe: ${abs}`);
  if (st.size > MAX_BYTES) throw new Error(`demasiado grande: ${name}`);

  const prev = await prisma.media.findFirst({ where: { altText: marker(name) } });
  if (prev && existsSync(path.join(UPLOAD_DIR, prev.filename))) return { url: prev.url, note: "ya estaba en la biblioteca" };

  const img = sharp(await readFile(abs));
  let meta;
  try {
    meta = await img.metadata();
  } catch {
    throw new Error(`no es una imagen válida: ${name}`);
  }
  const out = await img.resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const outMeta = await sharp(out).metadata();
  const filename = `${randomUUID()}.webp`;
  const url = `/uploads/${filename}`;
  if (!APPLY) return { url, note: `copiaría ${meta.width}×${meta.height} ${meta.format} → webp` };

  await mkdir(UPLOAD_DIR, { recursive: true });
  const target = path.join(UPLOAD_DIR, filename);
  if (path.dirname(target) !== UPLOAD_DIR) throw new Error("ruta fuera de UPLOAD_DIR");
  await writeFile(target, out);
  const written = await stat(target).catch(() => null);
  if (!written || written.size !== out.length) throw new Error(`no se pudo escribir ${filename}`);
  const data = { url, filename, mimeType: "image/webp", size: out.length, width: outMeta.width ?? null, height: outMeta.height ?? null, altText: marker(name) };
  if (prev) await prisma.media.update({ where: { id: prev.id }, data });
  else await prisma.media.create({ data });
  return { url, note: "copiada" };
}

async function main() {
  console.log(APPLY ? "\nMODO APLICAR (escribe bloques de trabajo e imágenes)" : "\nMODO DRY-RUN (no escribe nada)");
  console.log(`Origen: ${SOURCE}\nUPLOAD_DIR: ${UPLOAD_DIR}`);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  const pages = await prisma.page.findMany({
    where: { slug: { in: ["inicio", "contacto"] } },
    select: { id: true, slug: true, status: true, _count: { select: { blocks: true } } },
  });
  const by = Object.fromEntries(pages.map((p) => [p.slug, p]));

  // Cover images of the three featured posts already live in the CMS.
  const FEATURED = [
    { slug: "decisiones-claras-clave-para-equipos-efectivos", title: "Decisiones Claras: Clave para Equipos Efectivos" },
    { slug: "menos-improvisacion-mas-resultados-en-equipos-agiles", title: "Menos Improvisación, Más Resultados en Equipos Ágiles" },
    { slug: "transformando-equipos-agilidad-sin-caos", title: "Transformando Equipos: Agilidad sin Caos" },
  ];
  const posts = await prisma.post.findMany({ where: { slug: { in: FEATURED.map((f) => f.slug) } }, select: { slug: true, featuredImage: true } });
  const cover = Object.fromEntries(posts.map((p) => [p.slug, p.featuredImage]));

  const plan: Record<string, Planned[]> = {};
  const notes: string[] = [];
  const up = async (name: string) => {
    const r = await storeImage(prisma, name);
    notes.push(`${name}: ${r.note}`);
    return r.url;
  };

  // ── inicio ──
  if (by.inicio) {
    const logo = await up("c8436c_22560712040c4b93834656ffbc7141f8~mv2.png");
    const portrait = await up("c8436c_e823efaa084148098b6960d8c99c590c~mv2.jpg");
    const cards = [
      { file: "c8436c_0c976e98d692454a9a9effc64d2dfa8c~mv2.png", alt: "Formación en Agilidad y Gestión de Proyectos. Programas de formación diseñados para aplicar, no solo entender. Cursos, talleres y charlas sobre fundamentos ágiles, OKRs, gestión del cambio, Product Ownership y stakeholders. Formato tipo academia: contenido, práctica y comunidad. Ideal para profesionales en transición o crecimiento de carrera y empresas que buscan desarrollar capacidades internas en sus equipos." },
      { file: "c8436c_7c316dfa00d24e8585a74b1e70db41b4~mv2.png", alt: "Mentoría y Acompañamiento en Gestión Ágil. Sesiones 1:1 o grupales para profesionales y equipos que buscan implementar o mejorar sus prácticas ágiles de forma concreta. Revisión de boards, dinámicas de Scrum/Kanban, roles y formas de trabajo. Acompañamiento a líderes en procesos de transición hacia un mindset ágil. Ideal para profesionales en formación como PM o Scrum Master, y startups y PYMEs que buscan agilidad real, más allá de las ceremonias." },
      { file: "c8436c_d8c5ccc14ed04978afbe16154ef135f3~mv2.png", alt: "Diseño de Roadmaps y Planificación Estratégica. Transforma ideas en planes accionables y sostenibles. Diseño de roadmaps, definición de MVPs, planificación por iteraciones y análisis de riesgos. Ideal para equipos de tecnología, emprendedores y perfiles creativos, y personas con múltiples ideas que necesitan claridad para avanzar." },
    ];
    const cardUrls = [];
    for (const c of cards) cardUrls.push(await up(c.file));

    const p: Planned[] = [
      // 1) ¿Quién está detrás de…? — texto + logo + botón a la izquierda, retrato a la derecha
      text(col(0, 0, 55, 0), "<h2>¿Quién está detrás de</h2>"),
      image(col(0, 0, 55, 1), logo, "Agileology", "logo Agileology"),
      text(col(0, 0, 55, 2), "<p>Soy Lissette, project manager, formadora y exploradora de ideas.</p><p>En este espacio comparto lo que he aprendido sobre <strong>agilidad real</strong>, liderazgo y gestión sin adornos ni filtros.</p>"),
      link(col(0, 0, 55, 3), "Acerca de mí", "/sobre-mi"),
      image(col(0, 1, 45, 0), portrait, "Lissette Pimentel Sosa", "retrato"),
      // 2) Servicios
      text(col(1), "<h2>Servicios</h2><p>En este espacio comparto más que conocimientos: ofrezco acompañamiento estratégico para ayudarte a transformar ideas en resultados tangibles. Ya sea que estés dando tus primeros pasos en la gestión ágil, necesites claridad para estructurar tu proyecto o busques desarrollar nuevas habilidades, aquí encontrarás servicios diseñados para adaptarse a tu ritmo, tus retos y tu visión.</p><p>Desde mentorías personalizadas hasta planificación estratégica y formación especializada, cada servicio nace de mi experiencia liderando equipos reales, enfrentando proyectos complejos y apostando siempre por una agilidad humana, consciente y efectiva.</p><p>¿Lista(o) para dar el siguiente paso? Aquí podemos construirlo juntas(os).</p>"),
      // 3) Las 3 tarjetas de servicio (son imágenes en Wix)
      image(col(2, 0, 33), cardUrls[0], cards[0].alt, "tarjeta 1: Formación"),
      image(col(2, 1, 33), cardUrls[1], cards[1].alt, "tarjeta 2: Mentoría"),
      image(col(2, 2, 34), cardUrls[2], cards[2].alt, "tarjeta 3: Roadmaps"),
      // 4) Entradas destacadas (en Wix es un feed dinámico; aquí, 3 enlaces fijos a los posts)
      text(col(3), "<h2>Entradas destacadas</h2>"),
    ];
    FEATURED.forEach((f, i) => {
      const url = cover[f.slug];
      if (!url) throw new Error(`el post ${f.slug} no tiene imagen destacada`);
      const w = i === 2 ? 34 : 33;
      p.push(image(col(4, i, w, 0), url, f.title, `portada: ${f.slug}`));
      p.push(link(col(4, i, w, 1), f.title, `/blog/${f.slug}`));
    });
    plan.inicio = p;
  }

  // ── contacto ──
  if (by.contacto) {
    plan.contacto = [
      text(col(0), "<h2>Contacto</h2><p>C/ Antonio Maceo,<br />con Edmundo Martinez, 10102</p><p>829-214-2496</p><p><a href=\"mailto:scrummetme@gmail.com\">scrummetme@gmail.com</a></p>"),
      { ...col(1), type: "contactForm", content: { enabledFields: ["name", "email", "message"] }, label: "formulario (nombre, email, mensaje)" },
    ];
  }

  for (const [slug, blocks] of Object.entries(plan)) {
    const pg = by[slug];
    const skip = pg._count.blocks > 0;
    console.log(`\n▸ /${slug} (${pg.status}) → ${skip ? `OMITIR: ya tiene ${pg._count.blocks} bloque(s); no se toca` : `escribir ${blocks.length} bloques en el borrador de trabajo (NO publica)`}`);
    for (const b of blocks) console.log(`   sec ${b.position} col ${b.columnIndex}(${b.columnWidth}%) #${b.blockOrder}  ${b.type.padEnd(11)} ${b.label}`);
    if (skip || !APPLY) continue;
    await prisma.contentBlock.createMany({
      data: blocks.map((b) => ({
        pageId: pg.id, type: b.type, content: b.content as object,
        position: b.position, columnIndex: b.columnIndex, columnWidth: b.columnWidth, blockOrder: b.blockOrder,
      })),
    });
    console.log("   ✔ escritos");
  }
  if (notes.length) console.log("\nImágenes:\n  " + notes.join("\n  "));
  console.log(APPLY ? "\nListo. Las páginas siguen con su versión publicada anterior hasta que las publiques." : "\nDry-run terminado: no se escribió nada.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("\nERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
