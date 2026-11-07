/**
 * Rebuilds `sobre-mi` like the Wix page (working copy only; publish afterwards with
 * scripts/publish-pages.ts sobre-mi --apply):
 *  - banner: team photo under an indigo overlay with the logo on top (Background row)
 *  - grey band: text (left) + portrait in an oval (right), then the signature
 * It REPLACES the page's current blocks, so back them up first (the run prints how many).
 * Images are re-encoded to webp with UUID names, verified on disk and registered in Media.
 *
 *   npx tsx scripts/rebuild-wix-sobre-mi.ts            # dry run
 *   npx tsx scripts/rebuild-wix-sobre-mi.ts --apply
 */
import "dotenv/config";
import path from "node:path";
import { mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import sanitizeHtml from "sanitize-html";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const SOURCE = process.env.WIX_IMG_DIR ?? "/backups/wix-agileologywave/imagenes";
const UPLOAD_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve("uploads");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const FILES = {
  portrait: { file: "c8436c_089053458aea4511891bd75bcf2bad1f~mv2.jpg", width: 1200, alt: "Lissette Pimentel Sosa" },
  banner: { file: "c8436c_496cf9f8c376421d804c63f1f883fe05~mv2.jpg", width: 1920, alt: "" },
  signature: { file: "c8436c_e8111247ef644772b24420dcbb857256~mv2.png", width: 1200, alt: "Firma de Lissette Pimentel Sosa" },
  logo: { file: "c8436c_22560712040c4b93834656ffbc7141f8~mv2.png", width: 1200, alt: "Agileology" },
} as const;

const clean = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ["h2", "p", "strong", "em", "br"],
    allowedAttributes: { h2: ["style"] },
    allowedStyles: { h2: { color: [/^#[0-9a-fA-F]{6}$/] } },
  });

const TEXT = clean(
  '<h2 style="color:#1F2A44">¡Hola y bienvenid@!</h2>' +
    "<p>Soy <strong>Lissette Pimentel</strong>, una apasionada ingeniera en <strong>Tecnologías de la Información y comunicación</strong>, con doble maestría en Dirección Estratégica de TI (UNINI Puerto Rico y la Universidad Europea del Atlántico, España).</p>" +
    "<p>Además, estoy certificada como <strong>PMP®, Scrum Master, Agile Coach</strong> y <strong>Facilitadora Ágil</strong>, y llevo <strong>más de 11 años liderando equipos multidisciplinarios</strong> en sectores como fintech, ciberseguridad y software empresarial.</p>" +
    "<p>A lo largo de mi carrera he aprendido a transformar la complejidad en claridad, conectando personas, gestionando entornos distribuidos y asegurando la entrega de soluciones con impacto real. He liderado el lanzamiento de plataformas completas, desde e-commerce hasta sistemas internos y mobile, bajo plazos exigentes y con altos estándares de calidad.</p>" +
    "<p>Creo en el poder de la agilidad, la colaboración y la innovación. Este blog y espacio digital nace precisamente de eso: de las ganas de compartir experiencias reales, aprendizajes sin filtros y herramientas que puedan ayudarte a navegar mejor los desafíos del mundo de la gestión y la tecnología.</p>" +
    "<p>¡Gracias por estar aquí!</p>",
);

async function store(key: keyof typeof FILES): Promise<string> {
  const { file, width } = FILES[key];
  const marker = `Wix: ${file}`;
  const prev = await prisma.media.findFirst({ where: { altText: marker } });
  if (prev && existsSync(path.join(UPLOAD_DIR, prev.filename))) return prev.url; // already imported, file present
  const abs = path.join(SOURCE, file);
  const st = await stat(abs).catch(() => null);
  if (!st?.isFile()) throw new Error(`archivo no existe: ${abs}`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  const dest = path.join(UPLOAD_DIR, filename);
  const info = await sharp(abs).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 85 }).toFile(dest);
  const written = await stat(dest);
  if (written.size === 0) throw new Error(`no se pudo escribir ${filename}`);
  const data = { url: `/uploads/${filename}`, filename, mimeType: "image/webp", size: written.size, width: info.width, height: info.height, altText: marker };
  if (prev) await prisma.media.update({ where: { id: prev.id }, data });
  else await prisma.media.create({ data });
  return data.url;
}

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "sobre-mi" }, include: { blocks: true, background: true } });
  if (!page) throw new Error("No existe la página sobre-mi.");
  console.log(`Estado: ${page.status}; bloques actuales: ${page.blocks.length} (se reemplazan); fondo del banner: ${page.background ? "sí" : "no"}`);
  console.log("• banner: foto del equipo + capa índigo #3A3F7A + logo, sin título visible");
  console.log("• banda gris #E6E9EF: texto (60 %) y retrato en óvalo (40 %), luego la firma");
  if (!APPLY) {
    for (const k of Object.keys(FILES) as (keyof typeof FILES)[]) console.log(`  imagen ${k}: ${FILES[k].file}`);
    return;
  }
  const url = Object.fromEntries(await Promise.all((Object.keys(FILES) as (keyof typeof FILES)[]).map(async (k) => [k, await store(k)]))) as Record<keyof typeof FILES, string>;
  const band = { sectionBgColor: "#E6E9EF", sectionBgOpacity: 1 };
  const img = (u: string, alt: string, shape: "none" | "oval", width = 100) => ({ url: u, altText: alt, alignment: "center", shape, focalX: 50, focalY: 30, zoom: 1, width });
  await prisma.$transaction(async (tx) => {
    await tx.contentBlock.deleteMany({ where: { pageId: page.id } });
    await tx.contentBlock.createMany({
      data: [
        { pageId: page.id, type: "text", position: 0, columnIndex: 0, columnWidth: 60, blockOrder: 0, content: { html: TEXT }, ...band },
        { pageId: page.id, type: "image", position: 0, columnIndex: 1, columnWidth: 40, blockOrder: 0, content: img(url.portrait, FILES.portrait.alt, "oval"), ...band },
        { pageId: page.id, type: "image", position: 1, columnIndex: 0, columnWidth: 100, blockOrder: 0, content: img(url.signature, FILES.signature.alt, "none", 45), ...band },
      ],
    });
    const bg = { imageUrl: url.banner, bannerImageUrl: url.logo, overlayColor: "#3A3F7A", overlayOpacity: 0.82, showBanner: true, showTitle: false };
    if (page.background) await tx.background.update({ where: { id: page.background.id }, data: bg });
    else await tx.background.create({ data: { pageId: page.id, ...bg } });
  });
  console.log("✔ aplicado (copia de trabajo; falta publicar sobre-mi)");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
