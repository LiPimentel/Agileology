/**
 * `inicio` working copy: puts the sections below the video into the three-column grid -- the LinkedIn
 * section in the LEFT rail, everything else in the CENTRE; the video stays full width on top. The
 * right rail stays free (it only appears once a section is placed there). Nothing is published.
 *
 *   npx tsx scripts/set-inicio-zones.ts            # dry run
 *   npx tsx scripts/set-inicio-zones.ts --apply
 * Close `inicio` in the editor before --apply and reload after (the editor overwrites the whole page).
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
  const plan = new Map<number, string>();
  for (const pos of [...new Set(page.blocks.map((b) => b.position))].sort((a, b) => a - b)) {
    const inSection = page.blocks.filter((b) => b.position === pos);
    const zone = pos === 0 ? "full" : inSection.some((b) => b.type === "linkedinPosts") ? "left" : "main";
    plan.set(pos, zone);
    const types = [...new Set(inSection.map((b) => b.type))].join(", ");
    const current = inSection[0].sectionZone;
    console.log(`  sección ${pos} (${types}): ${current} → ${zone}`);
  }
  if (!APPLY) return;
  await prisma.$transaction(async (tx) => {
    for (const [position, zone] of plan) await tx.contentBlock.updateMany({ where: { pageId: page.id, position }, data: { sectionZone: zone } });
  });
  console.log("✔ aplicado en la copia de trabajo de inicio; falta publicar");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
