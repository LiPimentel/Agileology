/**
 * `inicio` (working copy only; nothing is published): three changes, each idempotent.
 *  1. LinkedIn block: a new section right below the video/hero, one narrow LEFT column (30%),
 *     empty, ready for the 5 posts to be pasted in the editor.
 *  2. "Entradas destacadas": the 3 hand-made image+link cards are replaced by the automatic
 *     rotating block (6 newest posts, 3 visible).
 *  3. Body text a bit larger: plain paragraphs of the "¿Quién está detrás?" and "Servicios"
 *     text blocks get font-size:large.
 *
 *   npx tsx scripts/setup-inicio-extras.ts            # dry run
 *   npx tsx scripts/setup-inicio-extras.ts --apply
 *
 * The editor overwrites a whole page when it saves: close `inicio` there before --apply and reload after.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "inicio" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página inicio.");
  const blocks = page.blocks;
  const hasLinkedin = blocks.some((b) => b.type === "linkedinPosts");
  const hasLatest = blocks.some((b) => b.type === "latestPosts");

  // Text size: only plain <p> (no style yet) in text blocks that are not the hero.
  const sizeEdits = blocks
    .filter((b) => b.type === "text" && b.position > 0)
    .map((b) => ({ b, html: String((b.content as { html?: string }).html ?? "") }))
    .map(({ b, html }) => ({ b, html, next: html.replace(/<p>/g, '<p style="font-size:large">') }))
    .filter((e) => e.next !== e.html);

  const positions = [...new Set(blocks.map((b) => b.position))].sort((a, b) => a - b);
  const insertLinkedin = !hasLinkedin;
  if (insertLinkedin && positions.join(",") !== "0,1,2,3,4,5,6,7") throw new Error(`La estructura de inicio no es la esperada (secciones: ${positions.join(",")}).`);
  const shift = insertLinkedin ? 1 : 0;
  const featuredPos = 7 + shift;
  const featured = blocks.filter((b) => b.position === 7 && (b.type === "image" || b.type === "link"));
  const replaceFeatured = !hasLatest && featured.length === 6 && featured.every((b) => b.type === "image" || String((b.content as { href?: string }).href ?? "").startsWith("/blog/"));

  console.log(insertLinkedin ? "1. LinkedIn: sección nueva en la posición 1 (bajo el video), columna izquierda 30%, vacía; las siguientes bajan una posición" : "1. LinkedIn: ya existe; nada que hacer");
  if (replaceFeatured) {
    console.log("2. Entradas destacadas: quito estos 6 bloques y pongo la rotación automática (6 entradas, 3 visibles):");
    for (const b of featured) console.log(`     - ${b.type} ${b.type === "link" ? String((b.content as { href: string }).href) : String((b.content as { url: string }).url)}`);
  } else console.log("2. Entradas destacadas: " + (hasLatest ? "ya usa la rotación automática" : "estructura distinta de la esperada; no la toco"));
  console.log(`3. Texto más grande: ${sizeEdits.length} bloque(s) de texto con párrafos que pasan a «Grande»`);
  if (!APPLY) return;

  const bg = blocks.find((b) => b.position === 1)!;
  const band = { sectionBgColor: bg.sectionBgColor, sectionBgOpacity: bg.sectionBgOpacity };
  await prisma.$transaction(async (tx) => {
    for (const e of sizeEdits) await tx.contentBlock.update({ where: { id: e.b.id }, data: { content: { ...(e.b.content as object), html: e.next } } });
    if (replaceFeatured) await tx.contentBlock.deleteMany({ where: { id: { in: featured.map((b) => b.id) } } });
    if (insertLinkedin) {
      const removed = new Set(replaceFeatured ? featured.map((f) => f.id) : []);
      for (const b of blocks) if (b.position >= 1 && !removed.has(b.id)) await tx.contentBlock.update({ where: { id: b.id }, data: { position: b.position + 1 } });
      await tx.contentBlock.create({
        data: {
          pageId: page.id, type: "linkedinPosts", position: 1, columnIndex: 0, columnWidth: 30, blockOrder: 0,
          content: { title: "Últimas publicaciones en LinkedIn", posts: [], visible: 4, autoplay: true, intervalSeconds: 6 },
          ...band,
        },
      });
    }
    if (replaceFeatured) {
      const f = featured[0];
      await tx.contentBlock.create({
        data: {
          pageId: page.id, type: "latestPosts", position: featuredPos, columnIndex: 0, columnWidth: 100, blockOrder: 0,
          content: { count: 6, autoplay: true, intervalSeconds: 6, author: "Lissette Pimentel Sosa" },
          sectionBgColor: f.sectionBgColor, sectionBgOpacity: f.sectionBgOpacity,
        },
      });
    }
  });
  console.log("✔ aplicado en la copia de trabajo de inicio; falta publicar");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
