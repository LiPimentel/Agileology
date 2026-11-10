/**
 * Crea (en BORRADOR, fuera del menú) las páginas «Proyectos» (/hub) y «Prosa» (/prosa):
 *  - /hub: vitrina con una tarjeta por app; cada botón apunta a la ruta estable de este sitio
 *    (/mytravel, /gantt, /hourglass, /nutrilog, /lpbag, /vitr, /prosa), que redirige (302) a la app.
 *  - /prosa: «Próximamente» del marketplace de novelas seriadas, con enlace a /contacto.
 * No enlaza apps personales. No publica ni toca el menú.
 *
 *   npx tsx scripts/setup-hub.ts            # dry run
 *   npx tsx scripts/setup-hub.ts --apply
 *
 * Idempotente: no toca una página que ya existe.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPS = [
  { name: "MyTravel", href: "/mytravel", desc: "Planifica y organiza tus viajes." },
  { name: "Generador de Gantt", href: "/gantt", desc: "Crea diagramas de Gantt para tus proyectos." },
  { name: "Hourglass", href: "/hourglass", desc: "" },
  { name: "NutriLog", href: "/nutrilog", desc: "Registra tu alimentación día a día." },
  { name: "LPBag", href: "/lpbag", desc: "" },
  { name: "VITR", href: "/vitr", desc: "Vitrina de preguntas." },
  { name: "Prosa", href: "/prosa", desc: "Novelas seriadas para autoras y lectoras. Próximamente." },
];

type B = { type: "text" | "link"; content: object; position: number; columnIndex: number; columnWidth: number };

function hubBlocks(): B[] {
  const out: B[] = [
    { type: "text", position: 0, columnIndex: 0, columnWidth: 100, content: { html: "<h2>Proyectos</h2><p>Herramientas y proyectos que he construido. Cada una se abre en su propio sitio.</p>" } },
  ];
  APPS.forEach((a, i) => {
    const position = 1 + Math.floor(i / 3);
    const col = i % 3;
    const html = `<h3>${a.name}</h3>${a.desc ? `<p>${a.desc}</p>` : ""}`;
    out.push({ type: "text", position, columnIndex: col, columnWidth: col === 1 ? 34 : 33, content: { html } });
  });
  return out;
}
// Each card's button goes in the same column, stacked under the text (blockOrder 1).
function withButtons(): (B & { blockOrder: number })[] {
  const res = hubBlocks().map((b) => ({ ...b, blockOrder: 0 }));
  APPS.forEach((a, i) => {
    const position = 1 + Math.floor(i / 3);
    const col = i % 3;
    res.push({ type: "link", position, columnIndex: col, columnWidth: col === 1 ? 34 : 33, blockOrder: 1,
      content: { label: a.href === "/prosa" ? "Ver más" : "Abrir", href: a.href, internal: true, newTab: a.href !== "/prosa" } });
  });
  return res;
}

const PROSA_HTML =
  "<h2>Prosa</h2><h3>Próximamente</h3>" +
  "<p>Prosa será un marketplace de novelas seriadas: un lugar donde las autoras publican sus historias por entregas y las lectoras las siguen capítulo a capítulo.</p>" +
  "<p>Estoy construyéndolo. Si eres autora o lectora y quieres enterarte cuando abra, escríbeme.</p>";

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const have = await prisma.page.findMany({ where: { slug: { in: ["hub", "prosa"] } }, select: { slug: true } });
  const exists = new Set(have.map((p) => p.slug));
  console.log(`• /hub «Proyectos»: ${exists.has("hub") ? "ya existe, no la toco" : `crear borrador con ${APPS.length} tarjetas`}`);
  console.log(`• /prosa «Prosa»: ${exists.has("prosa") ? "ya existe, no la toco" : "crear borrador «Próximamente» con botón a /contacto"}`);
  console.log("• ambas: borrador, fuera del menú. Descripciones vacías (Hourglass, LPBag): las completas tú.");
  if (!APPLY) return;
  if (!exists.has("hub")) {
    await prisma.page.create({
      data: {
        title: "Proyectos", slug: "hub", status: "draft", showInMenu: false, menuVisible: false,
        seoTitle: "Proyectos | Agileology", seoDescription: "Herramientas y proyectos de Lissette Pimentel.",
        blocks: { create: withButtons().map((b) => ({ ...b })) },
      },
    });
  }
  if (!exists.has("prosa")) {
    await prisma.page.create({
      data: {
        title: "Prosa", slug: "prosa", status: "draft", showInMenu: false, menuVisible: false,
        seoTitle: "Prosa, próximamente | Agileology", seoDescription: "Prosa: marketplace de novelas seriadas para autoras y lectoras.",
        blocks: { create: [
          { type: "text", position: 0, columnIndex: 0, columnWidth: 100, blockOrder: 0, content: { html: PROSA_HTML } },
          { type: "link", position: 1, columnIndex: 0, columnWidth: 100, blockOrder: 0, content: { label: "Escríbeme", href: "/contacto", internal: true, newTab: false } },
        ] },
      },
    });
  }
  console.log("✔ aplicado (borradores)");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
