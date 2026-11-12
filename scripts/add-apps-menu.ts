/**
 * Añade al menú principal «Apps ▾» (justo después de «Sobre Mi») con un submenú que apunta a las rutas
 * estables de las apps (/vitr, /mytravel, /gantt, /hourglass, /nutrilog, /lpbag), que redirigen (302).
 * Se abren en pestaña nueva. Idempotente: si ya existe «Apps», no hace nada.
 *   npx tsx scripts/add-apps-menu.ts [--apply]
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const KIDS = [
  ["VITR · Envía tu pregunta", "/vitr"], ["MyTravel", "/mytravel"], ["Generador de Gantt", "/gantt"],
  ["Hourglass", "/hourglass"], ["NutriLog", "/nutrilog"], ["LPBag", "/lpbag"],
] as const;

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN");
  const top = await prisma.menuItem.findMany({ where: { location: "header", parentId: null }, orderBy: { order: "asc" } });
  if (top.some((m) => m.label === "Apps")) return console.log("Ya existe «Apps»; no hago nada.");
  const sobre = top.find((m) => m.label.startsWith("Sobre"));
  if (!sobre) throw new Error("No encuentro «Sobre Mi» en el menú.");
  console.log(`• «Apps» después de «${sobre.label}» (orden ${sobre.order + 1}); los de después se corren una posición`);
  KIDS.forEach(([l, u]) => console.log(`  - ${l} → ${u} (pestaña nueva)`));
  if (!APPLY) return;
  await prisma.$transaction(async (tx) => {
    await tx.menuItem.updateMany({ where: { location: "header", parentId: null, order: { gt: sobre.order } }, data: { order: { increment: 1 } } });
    const parent = await tx.menuItem.create({ data: { label: "Apps", linkType: "url", externalUrl: "/", order: sobre.order + 1, location: "header", visible: true } });
    for (const [i, [label, url]] of KIDS.entries())
      await tx.menuItem.create({ data: { label, linkType: "url", externalUrl: url, newTab: true, order: i, location: "header", parentId: parent.id, visible: true } });
  });
  console.log("✔ aplicado");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
