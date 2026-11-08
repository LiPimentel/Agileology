/**
 * "Experiencias y Anécdotas": turns the empty Wix template page into an invitation to share an
 * experience, with a form (name, e-mail, story, optional permission to publish it). Wix's three
 * placeholder testimonials ("Click to edit and add your own") are NOT copied.
 *
 *   npx tsx scripts/setup-experiencias.ts            # dry run
 *   npx tsx scripts/setup-experiencias.ts --apply
 *
 * Only edits the DRAFT page and creates the form; nothing is published and the menu is untouched.
 * Idempotent: does nothing if the form already exists.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const FORM_NAME = "Comparte tu experiencia";

const FIELDS = [
  { label: "Tu nombre", fieldType: "text", required: true, placeholder: "Cómo quieres que te llame" },
  { label: "Tu correo", fieldType: "email", required: true, placeholder: "Para poder responderte (no se publica)" },
  { label: "Tu experiencia o anécdota", fieldType: "textarea", required: true, placeholder: "Cuéntame qué pasó, qué aprendiste…" },
  { label: "Autorizo que mi experiencia se publique en este sitio (puedo pedir que la quiten cuando quiera)", fieldType: "checkbox", required: false, placeholder: null },
];

const HTML =
  "<h2>Lo que no se cuenta en el CV</h2>" +
  "<p>Comparte tus experiencias: lo que salió bien, lo que salió mal y lo que aprendiste en el camino. Cuéntamelo aquí abajo.</p>" +
  '<p><small>Tu correo no se publica. Solo mostraré tu historia si marcas la autorización. Más información en la <a href="/privacy-policy">política de privacidad</a>.</small></p>';

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "experiencias-y-anecdotas" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página experiencias-y-anecdotas.");
  if (page.blocks.length !== 1 || page.blocks[0].type !== "text") throw new Error("La página ya no tiene la estructura esperada (un solo texto); no la toco.");
  if (await prisma.formDefinition.findFirst({ where: { name: FORM_NAME } })) {
    console.log("El formulario ya existe; no hago nada.");
    return;
  }
  console.log(`• formulario «${FORM_NAME}» con ${FIELDS.length} campos: ${FIELDS.map((f) => f.label.slice(0, 28)).join(" | ")}`);
  console.log("• la página (borrador) conserva su título y gana una invitación + aviso de privacidad");
  console.log("• una sección nueva debajo con el formulario");
  console.log(`• estado de la página: ${page.status} (no se publica ni se añade al menú)`);
  if (!APPLY) return;

  await prisma.$transaction(async (tx) => {
    const form = await tx.formDefinition.create({
      data: {
        name: FORM_NAME,
        successMessage: "¡Gracias por compartir tu experiencia! La leeré con calma.",
        fields: { create: FIELDS.map((f, order) => ({ ...f, order })) },
      },
    });
    await tx.contentBlock.update({ where: { id: page.blocks[0].id }, data: { content: { html: HTML } } });
    await tx.contentBlock.create({
      data: { pageId: page.id, type: "customForm", content: { formId: form.id }, position: 1, columnIndex: 0, columnWidth: 100, blockOrder: 0 },
    });
  });
  console.log("✔ aplicado (la página sigue en borrador)");
}
main().finally(() => prisma.$disconnect());
