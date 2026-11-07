/**
 * Second visual pass on `inicio` to match Wix's layout (working copy only; publish after with
 * scripts/publish-pages.ts inicio --apply):
 *  - new hero section on top: indigo band with "Bienvenidxs a" + the logo (banner band turned off)
 *  - every content section on the same light-grey band (#E6E9EF)
 *  - portrait in an oval
 *  - service cards ordered Mentoría, Roadmaps, Formación
 * Idempotent: it refuses to add a second hero. Run without --apply for a dry run.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "inicio" }, include: { blocks: true, background: true } });
  if (!page) throw new Error("No existe la página inicio.");
  const blocks = page.blocks;
  if (blocks.some((b) => b.type === "text" && String((b.content as { html?: string }).html ?? "").includes("Bienvenidxs"))) {
    console.log("Ya tiene el hero; no hago nada.");
    return;
  }
  const logoBlock = blocks.find((b) => b.type === "image" && (b.content as { altText?: string }).altText === "Agileology");
  const portrait = blocks.find((b) => b.type === "image" && (b.content as { altText?: string }).altText === "Lissette Pimentel Sosa");
  const cardKey = (b: (typeof blocks)[number]) => String((b.content as { altText?: string }).altText ?? "");
  const cards = blocks.filter((b) => b.position === 2 && b.type === "image");
  if (!logoBlock || !portrait || cards.length !== 3) throw new Error("La estructura de inicio no es la esperada.");
  const order = ["Mentoría", "Diseño de Roadmaps", "Formación"];
  const newCol = (b: (typeof blocks)[number]) => order.findIndex((k) => cardKey(b).startsWith(k));
  if (cards.some((c) => newCol(c) < 0)) throw new Error("No reconozco alguna tarjeta de servicio.");

  console.log("• hero nuevo en la posición 0 (las demás secciones bajan una)");
  console.log("• secciones 1-4: fondo #E6E9EF opacidad 1");
  console.log("• retrato: forma óvalo");
  console.log("• tarjetas: " + order.join(" → "));
  console.log("• banner superior vacío: se apaga (showBanner=false)");
  if (!APPLY) return;

  const logoUrl = (logoBlock.content as { url: string }).url;
  const band = { sectionBgColor: "#3A3F7A", sectionBgOpacity: 1 };
  await prisma.$transaction(async (tx) => {
    await tx.contentBlock.updateMany({ where: { pageId: page.id }, data: { position: { increment: 1 } } });
    await tx.contentBlock.updateMany({ where: { pageId: page.id, position: { gte: 1 } }, data: { sectionBgColor: "#E6E9EF", sectionBgOpacity: 1 } });
    for (const c of cards) await tx.contentBlock.update({ where: { id: c.id }, data: { columnIndex: newCol(c) } });
    await tx.contentBlock.update({ where: { id: portrait.id }, data: { content: { ...(portrait.content as object), shape: "oval" } } });
    await tx.contentBlock.create({
      data: { pageId: page.id, type: "text", position: 0, columnIndex: 0, columnWidth: 100, blockOrder: 0, ...band,
        content: { html: '<h2 style="color:#ffffff;text-align:center">Bienvenidxs a</h2>' } },
    });
    await tx.contentBlock.create({
      data: { pageId: page.id, type: "image", position: 0, columnIndex: 0, columnWidth: 100, blockOrder: 1, ...band,
        content: { url: logoUrl, altText: "Agileology", alignment: "center", shape: "none", focalX: 50, focalY: 50, zoom: 1, width: 100 } },
    });
    if (page.background) await tx.background.update({ where: { id: page.background.id }, data: { showBanner: false } });
  });
  console.log("✔ aplicado (borrador de trabajo; falta publicar)");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
