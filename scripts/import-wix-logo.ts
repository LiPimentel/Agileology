/**
 * Brings the Wix logo into the CMS: re-encodes it to webp under a UUID name in the uploads
 * folder, verifies the file landed, registers it in Media and points SiteSettings.logoUrl at
 * it. The favicon is a square crop of the logo's emblem (the Wix favicon was Wix's own
 * default icon, not the brand's).
 *
 *   npx tsx scripts/import-wix-logo.ts            (dry run: shows what it would do)
 *   npx tsx scripts/import-wix-logo.ts --apply
 */
import "dotenv/config";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
const SRC = process.env.LOGO_SRC ?? "/backups/wix-agileologywave/imagenes/c8436c_22560712040c4b93834656ffbc7141f8~mv2.png";
const UPLOAD_DIR = process.env.UPLOADS_DIR ?? path.resolve("uploads");

async function main() {
  const meta = await sharp(SRC).metadata();
  console.log(`logo origen: ${meta.width}x${meta.height} ${meta.format}`);
  if (!meta.width || !meta.height) throw new Error("No es una imagen válida");
  const emblemSide = Math.min(meta.height, Math.round(meta.width * 0.22)); // emblem is the left ~22%
  if (!APPLY) {
    console.log(`(dry run) crearía logo.webp y favicon (recorte ${emblemSide}x${emblemSide}) en ${UPLOAD_DIR} y actualizaría SiteSettings`);
    return;
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const make = async (buf: Buffer, label: string) => {
      const name = `${randomUUID()}.webp`;
      const dest = path.join(UPLOAD_DIR, name);
      if (path.dirname(path.resolve(dest)) !== path.resolve(UPLOAD_DIR)) throw new Error("ruta fuera de uploads");
      const info = await sharp(buf).webp({ quality: 90 }).toFile(dest);
      const st = await stat(dest);
      if (st.size === 0) throw new Error(`archivo vacío: ${name}`);
      const media = await prisma.media.create({
        data: { url: `/uploads/${name}`, filename: name, mimeType: "image/webp", size: st.size, width: info.width, height: info.height, altText: `Wix: ${label}` },
      });
      return media.url;
    };
    const logoUrl = await make(await sharp(SRC).toBuffer(), "logo");
    const faviconUrl = await make(
      await sharp(SRC).extract({ left: 0, top: 0, width: emblemSide, height: emblemSide }).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      "favicon",
    );
    const settings = await prisma.siteSettings.findFirst();
    if (!settings) throw new Error("No hay SiteSettings");
    await prisma.siteSettings.update({ where: { id: settings.id }, data: { logoUrl, faviconUrl } });
    console.log(`listo: logo ${logoUrl}, favicon ${faviconUrl}`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
