/**
 * Publishes the given pages exactly as the admin's "Guardar y publicar" does
 * (src/lib/pages.ts → publishPage): snapshot of the working rows into a new PageVersion,
 * then status = published. Previous versions are kept, so it can be rolled back from
 * /admin/pages/<id>/versions.
 *
 *   npx tsx scripts/publish-pages.ts inicio contacto            # dry-run (default)
 *   npx tsx scripts/publish-pages.ts inicio contacto --apply
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
const slugs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (slugs.length === 0) throw new Error("Indica al menos un slug.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  for (const slug of slugs) {
    const page = await prisma.page.findUnique({
      where: { slug },
      include: {
        blocks: { orderBy: [{ position: "asc" }, { columnIndex: "asc" }, { blockOrder: "asc" }] },
        background: true,
      },
    });
    if (!page) {
      console.log(`✗ /${slug}: no existe`);
      continue;
    }
    // Same shape as buildPageSnapshot() in src/lib/pages.ts.
    const snapshot = {
      id: page.id,
      title: page.title,
      blocks: page.blocks.map((b) => ({
        id: b.id, type: b.type, content: b.content,
        position: b.position, columnIndex: b.columnIndex, columnWidth: b.columnWidth, blockOrder: b.blockOrder,
        sectionBgImageUrl: b.sectionBgImageUrl, sectionBgColor: b.sectionBgColor, sectionBgOpacity: b.sectionBgOpacity,
        sectionBgVideoUrl: b.sectionBgVideoUrl, sectionBgGradientEnd: b.sectionBgGradientEnd,
        sectionBgFocalX: b.sectionBgFocalX, sectionBgFocalY: b.sectionBgFocalY, sectionBgZoom: b.sectionBgZoom, sectionMinHeight: b.sectionMinHeight, sectionZone: b.sectionZone,
        sectionLayoutMode: b.sectionLayoutMode, sectionFreeHeight: b.sectionFreeHeight,
        freeX: b.freeX, freeY: b.freeY, freeWidth: b.freeWidth, freeHeight: b.freeHeight, freeZIndex: b.freeZIndex,
      })),
      background: page.background
        ? {
            imageUrl: page.background.imageUrl, overlayColor: page.background.overlayColor,
            overlayOpacity: page.background.overlayOpacity, focalX: page.background.focalX, focalY: page.background.focalY, zoom: page.background.zoom, bannerImageUrl: page.background.bannerImageUrl,
            showBanner: page.background.showBanner, showTitle: page.background.showTitle,
            sideLeftWidth: page.background.sideLeftWidth, sideRightWidth: page.background.sideRightWidth, gridMaxWidth: page.background.gridMaxWidth, wideLayout: page.background.wideLayout,
          }
        : null,
    };
    console.log(`▸ /${slug}: ${page.blocks.length} bloques → ${APPLY ? "publicando" : "publicaría"} (estado actual: ${page.status})`);
    if (!APPLY) continue;
    await prisma.$transaction([
      prisma.pageVersion.create({ data: { pageId: page.id, snapshot: snapshot as object } }),
      prisma.page.update({ where: { id: page.id }, data: { status: "published", publishedAt: new Date() } }),
    ]);
    console.log("  ✔ publicada");
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
