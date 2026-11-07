/**
 * Makes the top band of `inicio` look like Wix's: a flat indigo (#3A3F7A, theme color_44)
 * with no photo and no visible title. Touches only the Background row of `inicio`
 * (the working copy); run scripts/publish-pages.ts afterwards to make it public.
 *
 *   npx tsx scripts/style-wix-banner.ts            # dry-run (default)
 *   npx tsx scripts/style-wix-banner.ts --apply
 *
 * The previous values are printed so the change can be undone from the admin.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const NEW = { imageUrl: null, bannerImageUrl: null, overlayColor: "#3A3F7A", overlayOpacity: 1, showBanner: true, showTitle: false };

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "inicio" }, include: { background: true } });
  if (!page?.background) throw new Error("inicio no tiene fila Background.");
  const b = page.background;
  const old = { imageUrl: b.imageUrl, bannerImageUrl: b.bannerImageUrl, overlayColor: b.overlayColor, overlayOpacity: b.overlayOpacity, showBanner: b.showBanner, showTitle: b.showTitle };
  console.log("Antes: ", JSON.stringify(old));
  console.log("Después:", JSON.stringify(NEW));
  if (APPLY) {
    await prisma.background.update({ where: { id: b.id }, data: NEW });
    console.log("✔ aplicado (borrador de trabajo; falta publicar)");
  }
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
