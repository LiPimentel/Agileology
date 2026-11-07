/**
 * Creates the pages that exist on the old Wix sites but not yet in the CMS, as DRAFTS.
 *
 *   npx tsx scripts/import-wix-pages.ts            # dry-run (default): prints, writes nothing
 *   npx tsx scripts/import-wix-pages.ts --apply    # creates the missing pages
 *
 * Safety rules:
 * - Only creates pages whose slug does not exist yet. An existing page (inicio, sobre-mi,
 *   contacto, privacy-policy, 1111, 2222, or anything edited in the CMS) is NEVER modified.
 * - Everything is created as `draft` with no PageVersion, so nothing becomes public until
 *   the author publishes it from the admin.
 * - Text goes through sanitize-html with the same tags the CMS editor understands.
 *
 * Content comes from ~/Backups/wix-agileologywave/CONTENIDO.md (Servicios, Experiencias) and
 * ~/Backups/wix-scrumtia/paginas/ (Podcast, Interesante, LinkedIn feed), transcribed below
 * so the result is reviewable in one place. The 3 testimonials on "Experiencias y Anécdotas"
 * are Wix template text and are deliberately NOT migrated.
 */
import "dotenv/config";
import sanitizeHtml from "sanitize-html";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply") && !process.argv.includes("--dry-run");

const clean = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "h2", "h3", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (_t, attribs) => ({
        tagName: "a",
        attribs: { href: attribs.href ?? "", target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  }).trim();

type PageBlock = { html: string; position: number; columnIndex?: number; columnWidth?: number };
type PageSpec = { title: string; slug: string; note: string; blocks: PageBlock[] };

const card = (title: string, bullets: string[], ideal: string[]) =>
  `<h3>${title}</h3><ul>${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` +
  `<p><strong>Ideal para:</strong></p><ul>${ideal.map((b) => `<li>${b}</li>`).join("")}</ul>`;

const PAGES: PageSpec[] = [
  {
    title: "Servicios",
    slug: "servicios",
    note: "intro + 3 tarjetas (en Wix eran imágenes; texto transcrito de CONTENIDO.md)",
    blocks: [
      {
        position: 0,
        html:
          "<h2>Servicios</h2>" +
          "<p>En este espacio comparto más que conocimientos: ofrezco acompañamiento estratégico para ayudarte a transformar ideas en resultados tangibles. Ya sea que estés dando tus primeros pasos en la gestión ágil, necesites claridad para estructurar tu proyecto o busques desarrollar nuevas habilidades, aquí encontrarás servicios diseñados para adaptarse a tu ritmo, tus retos y tu visión.</p>" +
          "<p>Desde mentorías personalizadas hasta planificación estratégica y formación especializada, cada servicio nace de mi experiencia liderando equipos reales, enfrentando proyectos complejos y apostando siempre por una agilidad humana, consciente y efectiva.</p>" +
          "<p>¿Lista(o) para dar el siguiente paso? Aquí podemos construirlo juntas(os).</p>",
      },
      {
        position: 1, columnIndex: 0, columnWidth: 33,
        html: card(
          "Formación en Agilidad y Gestión de Proyectos",
          [
            "<strong>Programas de formación diseñados para aplicar</strong>, no solo entender.",
            "Cursos, talleres y charlas sobre <strong>fundamentos ágiles, OKRs, gestión del cambio, Product Ownership y stakeholders.</strong>",
            "Formato tipo academia: <strong>contenido, práctica y comunidad.</strong>",
          ],
          [
            "<strong>Profesionales en transición o crecimiento</strong> de carrera.",
            "<strong>Empresas que buscan desarrollar capacidades internas</strong> en sus equipos.",
          ],
        ),
      },
      {
        position: 1, columnIndex: 1, columnWidth: 33,
        html: card(
          "Mentoría y Acompañamiento en Gestión Ágil",
          [
            "<strong>Sesiones 1:1 o grupales</strong> para profesionales y equipos que buscan implementar o mejorar sus <strong>prácticas ágiles de forma concreta.</strong>",
            "Revisión de boards, dinámicas de <strong>Scrum/Kanban,</strong> roles y formas de trabajo.",
            "<strong>Acompañamiento a líderes</strong> en procesos de transición hacia un mindset ágil.",
          ],
          [
            "<strong>Profesionales en formación</strong> como PM o Scrum Master.",
            "<strong>Startups y PYMEs que buscan agilidad real,</strong> más allá de las ceremonias.",
          ],
        ),
      },
      {
        position: 1, columnIndex: 2, columnWidth: 34,
        html: card(
          "Diseño de Roadmaps y Planificación Estratégica",
          [
            "<strong>Transforma ideas en planes</strong> accionables y sostenibles.",
            "Diseño de <strong>roadmaps,</strong> definición de <strong>MVPs,</strong> planificación por iteraciones y análisis de riesgos.",
          ],
          [
            "Equipos de <strong>tecnología, emprendedores y perfiles creativos.</strong>",
            "<strong>Personas con múltiples ideas</strong> que necesitan claridad para avanzar.",
          ],
        ),
      },
    ],
  },
  {
    title: "Experiencias y Anécdotas",
    slug: "experiencias-y-anecdotas",
    note: "solo título y subtítulo; los 3 testimonios de plantilla de Wix NO se migran",
    blocks: [{ position: 0, html: "<h2>Lo que no se cuenta en el CV</h2><p>Comparte tus experiencias</p>" }],
  },
  {
    title: "Podcast",
    slug: "podcast",
    note: "solo «Próximamente» (como en el sitio antiguo)",
    blocks: [{ position: 0, html: "<p>¡Próximamente!</p>" }],
  },
  {
    title: "Interesante",
    slug: "interesante",
    note: "Consultorías + Instagram (enlace a confirmar: agileology vs scrumtia)",
    blocks: [
      {
        position: 0,
        html:
          "<h2>Consultorías</h2>" +
          "<p>Si estás interesado en consejos u orientación en la gestión y dirección de tus proyectos, comunícate conmigo.</p>" +
          "<h2>Instagram</h2>" +
          '<p>Te invito a seguirme en <a href="https://www.instagram.com/agileology/">Instagram</a> y mantenerte al día de las novedades e informaciones interesantes sobre Agile y Gestión de proyectos en general.</p>',
      },
    ],
  },
  {
    title: "LinkedIn feed",
    slug: "linkedin-feed",
    note: "vacía: en Wix es un widget de feed, no hay texto que migrar",
    blocks: [],
  },
];

async function main() {
  console.log(APPLY ? "\nMODO APLICAR (crea páginas)" : "\nMODO DRY-RUN (no escribe nada)");
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL no está definida.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) });

  let created = 0;
  for (const spec of PAGES) {
    const existing = await prisma.page.findUnique({ where: { slug: spec.slug }, select: { id: true, status: true } });
    const blocks = spec.blocks.map((b) => ({ ...b, html: clean(b.html) }));
    if (blocks.some((b) => !b.html)) throw new Error(`${spec.slug}: un bloque quedó vacío tras sanear`);
    if (blocks.some((b) => /style\s*=|<script/i.test(b.html))) throw new Error(`${spec.slug}: HTML con estilos/scripts`);

    console.log(`\n▸ /${spec.slug}  «${spec.title}»  → ${existing ? `OMITIR (ya existe, ${existing.status}; no se toca)` : "CREAR como borrador"}`);
    console.log(`  ${spec.note}`);
    console.log(`  bloques: ${blocks.length}${blocks.length ? ` (${blocks.map((b) => `pos ${b.position}${b.columnIndex !== undefined ? `/col ${b.columnIndex}` : ""}`).join(", ")})` : " (página vacía)"}`);
    for (const b of blocks) console.log(`    · ${b.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 110)}…`);

    if (existing || !APPLY) continue;
    await prisma.page.create({
      data: {
        title: spec.title,
        slug: spec.slug,
        status: "draft",
        background: { create: {} },
        blocks: {
          create: blocks.map((b) => ({
            type: "text" as const,
            content: { html: b.html },
            position: b.position,
            columnIndex: b.columnIndex ?? 0,
            columnWidth: b.columnWidth ?? 100,
          })),
        },
      },
    });
    created++;
    console.log("  ✔ creada");
  }
  console.log(APPLY ? `\nListo: ${created} página(s) creada(s).` : "\nDry-run terminado: no se escribió nada.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("\nERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
