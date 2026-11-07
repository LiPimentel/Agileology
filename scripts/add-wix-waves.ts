/**
 * Adds Wix's decorative wave dividers to `inicio` (working copy; publish after with
 * scripts/publish-pages.ts inicio --apply). The wave is Wix's own vector (stroke #9fabdf,
 * round caps) drawn once as a transparent webp (UUID name, verified on disk, registered in
 * Media), then placed as an image block in two new grey sections: between "¿Quién está detrás
 * de…?" and "Servicios", and between the service cards and "Entradas destacadas".
 *
 *   npx tsx scripts/add-wix-waves.ts            # dry run
 *   npx tsx scripts/add-wix-waves.ts --apply
 *
 * Idempotent: it does nothing if the wave image is already on the page.
 */
import "dotenv/config";
import path from "node:path";
import { mkdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const UPLOAD_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve("uploads");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const MARKER = "Wix: onda decorativa";

// Wix's wave path (viewBox 53.43 x 6.79). Stroke width 1.1 units reproduces Wix's thickness.
const WAVE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 53.43 6.79" width="1600" height="203"><path d="M.5 4.48C4.54 2.73 8.64.79 13.07.53c4.67-.32 9.1 1.73 13.95 3.5 9.24 3.71 17.27 2.76 25.9-2.18" fill="none" stroke="#9fabdf" stroke-width="1.1" stroke-linecap="round" stroke-miterlimit="10"/></svg>`;

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "inicio" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página inicio.");
  const existing = await prisma.media.findFirst({ where: { altText: MARKER } });
  if (existing && page.blocks.some((b) => (b.content as { url?: string }).url === existing.url)) {
    console.log("Las ondas ya están en inicio; no hago nada.");
    return;
  }
  // Expected structure after restyle-wix-home: 0 hero, 1 quién, 2 servicios, 3 tarjetas, 4 entradas (título), 5 entradas.
  const positions = [...new Set(page.blocks.map((b) => b.position))].sort((a, b) => a - b);
  if (positions.join(",") !== "0,1,2,3,4,5") throw new Error(`La estructura de inicio no es la esperada (secciones: ${positions.join(",")}).`);
  console.log("• onda A entre «¿Quién está detrás de…?» y «Servicios»");
  console.log("• onda B entre las tarjetas de servicios y «Entradas destacadas»");
  console.log("• secciones nuevas con fondo #E6E9EF; las siguientes bajan de posición");
  if (!APPLY) return;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.webp`;
  const dest = path.join(UPLOAD_DIR, name);
  const info = await sharp(Buffer.from(WAVE_SVG)).webp({ quality: 92, alphaQuality: 100 }).toFile(dest);
  const st = await stat(dest);
  if (st.size === 0) throw new Error("El archivo de la onda quedó vacío.");
  const url = `/uploads/${name}`;
  await prisma.media.create({ data: { url, filename: name, mimeType: "image/webp", size: st.size, width: info.width, height: info.height, altText: MARKER } });

  // old position -> new position (two inserted sections: after 1 and after 3)
  const map: Record<number, number> = { 0: 0, 1: 1, 2: 3, 3: 4, 4: 6, 5: 7 };
  const band = { sectionBgColor: "#E6E9EF", sectionBgOpacity: 1 };
  const waveContent = { url, altText: "", alignment: "center", shape: "none", focalX: 50, focalY: 50, zoom: 1, width: 70 };
  await prisma.$transaction(async (tx) => {
    for (const b of page.blocks) await tx.contentBlock.update({ where: { id: b.id }, data: { position: map[b.position] } });
    for (const pos of [2, 5]) {
      await tx.contentBlock.create({ data: { pageId: page.id, type: "image", position: pos, columnIndex: 0, columnWidth: 100, blockOrder: 0, content: waveContent, ...band } });
    }
  });
  console.log(`✔ aplicado: ${url} (${info.width}x${info.height}); falta publicar inicio`);
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
