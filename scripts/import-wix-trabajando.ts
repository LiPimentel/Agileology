/**
 * Añade a la biblioteca la foto «Trabajando» (fondo de la cabecera de «Experiencias y Anécdotas» en
 * agileologywave.com). Solo crea el archivo y su registro en la biblioteca; no cambia ninguna página.
 *
 *   npx tsx scripts/import-wix-trabajando.ts            # dry run
 *   npx tsx scripts/import-wix-trabajando.ts --apply
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
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const UPLOAD_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve("uploads");
const SRC = "https://static.wixstatic.com/media/11062b_600bda368cd44e09a5ba13418d2efc93~mv2.jpg";
const ALT = "Wix: Trabajando (fondo de Experiencias y Anécdotas)";

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  if (await prisma.media.findFirst({ where: { altText: ALT } })) { console.log("Ya está en la biblioteca; no hago nada."); return; }
  console.log(`• se descarga ${SRC} (5000×3333) y se guarda como webp de hasta 2400 px de ancho`);
  console.log(`• aparece en la biblioteca como «${ALT}»`);
  console.log("• NO se asigna a ninguna página; es una foto de archivo de Wix: revisa que puedas usarla fuera de Wix");
  if (!APPLY) return;
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`No pude descargar la imagen (${res.status}).`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.webp`;
  const dest = path.join(UPLOAD_DIR, name);
  const info = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 82 }).toFile(dest);
  const st = await stat(dest);
  if (st.size === 0) throw new Error("La imagen quedó vacía.");
  await prisma.media.create({ data: { url: `/uploads/${name}`, filename: name, mimeType: "image/webp", size: st.size, width: info.width, height: info.height, altText: ALT } });
  console.log(`✔ añadida: /uploads/${name} (${info.width}×${info.height}, ${Math.round(st.size / 1024)} KB)`);
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
