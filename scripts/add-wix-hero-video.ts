/**
 * Puts Wix's hero video ("VidWebFinal.mp4", the background of the "Bienvenidxs a Agileology"
 * strip) behind the first section of `inicio`. The file (720p H.264, downloaded from the Wix
 * CDN) is checked (MP4 header, <= 25 MB), saved under a UUID name, verified on disk and
 * registered in Media. The section keeps the indigo tint, lowered to 60 % so the video shows.
 * Working copy only; publish afterwards with scripts/publish-pages.ts inicio --apply.
 *
 *   npx tsx scripts/add-wix-hero-video.ts            # dry run
 *   npx tsx scripts/add-wix-hero-video.ts --apply
 */
import "dotenv/config";
import path from "node:path";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const SRC = process.env.HERO_VIDEO ?? "/work/hero.mp4";
const UPLOAD_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve("uploads");
const MAX_BYTES = 25 * 1024 * 1024;
const MARKER = "Wix: VidWebFinal.mp4";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const st = await stat(SRC).catch(() => null);
  if (!st?.isFile()) throw new Error(`No encuentro el video: ${SRC}`);
  if (st.size > MAX_BYTES) throw new Error("El video supera los 25 MB.");
  const head = (await readFile(SRC)).subarray(4, 8).toString("latin1");
  if (head !== "ftyp") throw new Error("El archivo no parece un MP4.");
  console.log(`Video: ${(st.size / 1024 / 1024).toFixed(1)} MB, cabecera MP4 correcta`);

  const page = await prisma.page.findUnique({ where: { slug: "inicio" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página inicio.");
  const hero = page.blocks.filter((b) => b.position === 0);
  const looksLikeHero = hero.some((b) => b.type === "text" && String((b.content as { html?: string }).html ?? "").includes("Bienvenidxs"));
  if (!looksLikeHero) throw new Error("La primera sección de inicio no es «Bienvenidxs a…»; no la toco.");
  if (hero.some((b) => b.sectionBgVideoUrl)) {
    console.log("La sección de bienvenida ya tiene un video de fondo; no hago nada.");
    return;
  }
  console.log(`• ${hero.length} bloques de la sección de bienvenida: fondo = video, capa índigo al 60 %`);
  if (!APPLY) return;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.mp4`;
  const dest = path.join(UPLOAD_DIR, filename);
  await copyFile(SRC, dest);
  const written = await stat(dest);
  if (written.size !== st.size) throw new Error("El video no se copió completo.");
  const url = `/uploads/${filename}`;
  await prisma.$transaction(async (tx) => {
    await tx.media.create({ data: { url, filename, mimeType: "video/mp4", size: written.size, altText: MARKER } });
    await tx.contentBlock.updateMany({ where: { pageId: page.id, position: 0 }, data: { sectionBgVideoUrl: url, sectionBgOpacity: 0.6 } });
  });
  console.log(`✔ aplicado: ${url} (falta publicar inicio)`);
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
