/**
 * Applies the Wix colours to the sections of `inicio` (working rows only; publish separately).
 *
 *   npx tsx scripts/style-wix-home.ts            # dry-run (default)
 *   npx tsx scripts/style-wix-home.ts --apply
 *
 * Colours come from the Wix page itself (raw/inicio.html), theme palette:
 *   headings                  color_44 = #3A3F7A
 *   "Servicios" + cards       color_36 / color_11 = #E6E9EF, solid
 *   "¿Quién está detrás de…"  #E6E9EF at 20 % (Wix: rgba(var(--color_36), 0.2))
 *   "Entradas destacadas"     no background (transparent in Wix)
 * Only sectionBg* columns and the colour of the three h2 headings are touched; nothing else.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const HEADING = "#3A3F7A";
const LIGHT = "#E6E9EF";
// section position → background (as built by scripts/update-wix-home.ts)
const SECTIONS: Array<{ position: number; name: string; color: string; opacity: number }> = [
  { position: 0, name: "¿Quién está detrás de…", color: LIGHT, opacity: 0.2 },
  { position: 1, name: "Servicios", color: LIGHT, opacity: 1 },
  { position: 2, name: "Tarjetas de servicio", color: LIGHT, opacity: 1 },
  { position: 3, name: "Entradas destacadas (título)", color: "#000000", opacity: 0 },
  { position: 4, name: "Entradas destacadas (posts)", color: "#000000", opacity: 0 },
];
const HEADED = ["¿Quién está detrás de", "Servicios", "Entradas destacadas"];

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "inicio" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página inicio.");
  if (page.blocks.length === 0) throw new Error("inicio no tiene bloques; ejecuta primero update-wix-home.ts");

  for (const s of SECTIONS) {
    const n = page.blocks.filter((b) => b.position === s.position).length;
    console.log(`▸ sección ${s.position} «${s.name}»: ${n} bloque(s) → fondo ${s.color} opacidad ${s.opacity}`);
    if (APPLY && n > 0) {
      await prisma.contentBlock.updateMany({
        where: { pageId: page.id, position: s.position },
        data: { sectionBgColor: s.color, sectionBgOpacity: s.opacity },
      });
    }
  }

  for (const b of page.blocks.filter((x) => x.type === "text")) {
    const html = String((b.content as { html?: string }).html ?? "");
    const next = html.replace(/<h2>([^<]*)<\/h2>/g, (m, t: string) =>
      HEADED.includes(t.trim()) ? `<h2 style="color:${HEADING}">${t}</h2>` : m,
    );
    if (next === html) continue;
    console.log(`▸ título en índigo ${HEADING}: ${HEADED.filter((h) => next.includes(`>${h}<`)).join(", ")}`);
    if (APPLY) await prisma.contentBlock.update({ where: { id: b.id }, data: { content: { html: next } } });
  }
  console.log(APPLY ? "Listo (solo el borrador de trabajo; falta publicar)." : "Dry-run terminado: no se escribió nada.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
