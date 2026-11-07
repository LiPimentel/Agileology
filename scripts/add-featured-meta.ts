/**
 * "Entradas destacadas" on `inicio` shows, like Wix, a meta line under each post image:
 * "Lissette Pimentel Sosa · 14 abr. · 4 min de lectura". The date comes from the post's
 * publishedAt (Santo Domingo time) and the reading time from its text (~238 words/min).
 * These are static text blocks (the featured list itself is three fixed links), so re-run
 * this script if a featured post changes. Working copy only; publish inicio afterwards.
 *
 *   npx tsx scripts/add-featured-meta.ts            # dry run
 *   npx tsx scripts/add-featured-meta.ts --apply
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const AUTHOR = "Lissette Pimentel Sosa";
const fmt = new Intl.DateTimeFormat("es", { timeZone: "America/Santo_Domingo", day: "numeric", month: "short" });

const words = (html: string) => html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "inicio" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página inicio.");
  const links = page.blocks.filter((b) => b.type === "link" && String((b.content as { href?: string }).href ?? "").startsWith("/blog/"));
  if (links.length === 0) throw new Error("No encuentro los enlaces de «Entradas destacadas».");
  const position = links[0].position;
  if (page.blocks.some((b) => b.position === position && b.type === "text")) {
    console.log("Las líneas de autora/fecha ya existen; no hago nada.");
    return;
  }
  const plan: Array<{ link: (typeof links)[number]; line: string }> = [];
  for (const l of links) {
    const slug = String((l.content as { href: string }).href).replace("/blog/", "");
    const post = await prisma.post.findUnique({ where: { slug }, select: { publishedAt: true, blocks: { where: { type: "text" }, select: { content: true } } } });
    if (!post?.publishedAt) throw new Error(`El post ${slug} no tiene fecha de publicación.`);
    const total = post.blocks.reduce((n, b) => n + words(String((b.content as { html?: string }).html ?? "")), 0);
    const minutes = Math.max(1, Math.round(total / 238));
    const line = `${AUTHOR} · ${fmt.format(post.publishedAt)}. · ${minutes} min de lectura`;
    plan.push({ link: l, line });
    console.log(`• columna ${l.columnIndex}: ${line}`);
  }
  if (!APPLY) return;
  await prisma.$transaction(async (tx) => {
    for (const { link, line } of plan) {
      await tx.contentBlock.update({ where: { id: link.id }, data: { blockOrder: 2 } });
      await tx.contentBlock.create({
        data: {
          pageId: page.id, type: "text", position: link.position, columnIndex: link.columnIndex, columnWidth: link.columnWidth, blockOrder: 1,
          content: { html: `<p>${line}</p>` },
          sectionBgImageUrl: link.sectionBgImageUrl, sectionBgColor: link.sectionBgColor, sectionBgOpacity: link.sectionBgOpacity,
        },
      });
    }
  });
  console.log("✔ aplicado (falta publicar inicio)");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
