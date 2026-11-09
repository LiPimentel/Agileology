/**
 * Página «Contacto» (borrador) como la de Wix: añade el mapa y cambia el formulario fijo
 * (Nombre/Email/Mensaje) por un formulario de la biblioteca con Nombre, Apellido, Email y Mensaje.
 * No cambia la dirección, el teléfono ni el correo (agileologywave@gmail.com). No publica.
 *
 *   npx tsx scripts/setup-contacto.ts            # dry run
 *   npx tsx scripts/setup-contacto.ts --apply
 *
 * Idempotente. Cierra la página Contacto en el editor antes de --apply.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const FORM_NAME = "Contacto";
const ADDRESS = "C/ Antonio Maceo, con Edmundo Martinez, 10102, Santo Domingo, República Dominicana";

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "contacto" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página contacto.");
  if (page.blocks.some((b) => b.type === "map")) { console.log("La página ya tiene mapa; no hago nada."); return; }
  const text = page.blocks.find((b) => b.type === "text");
  const old = page.blocks.find((b) => b.type === "contactForm");
  if (page.blocks.length !== 2 || !text || !old) throw new Error("La página no tiene la estructura esperada (texto + formulario); no la toco.");
  const existing = await prisma.formDefinition.findFirst({ where: { name: FORM_NAME } });
  console.log("• sección 0: texto (sin cambios)");
  console.log(`• sección 1: mapa con «${ADDRESS}»`);
  console.log(`• sección 2: formulario «${FORM_NAME}» (Nombre, Apellido, Email, Mensaje) en lugar del formulario fijo${existing ? " (ya existe, se reutiliza)" : ""}`);
  console.log("• los mensajes del formulario nuevo llegan al correo de destino general de Comunicaciones");
  console.log(`• estado: ${page.status} (no se publica)`);
  if (!APPLY) return;
  await prisma.$transaction(async (tx) => {
    const form = existing ?? (await tx.formDefinition.create({
      data: {
        name: FORM_NAME,
        successMessage: "Gracias, tu mensaje fue enviado. Te responderé pronto.",
        fields: { create: [
          { label: "Nombre", fieldType: "text", required: true, options: [], order: 0 },
          { label: "Apellido", fieldType: "text", required: false, options: [], order: 1 },
          { label: "Email", fieldType: "email", required: true, options: [], order: 2 },
          { label: "Mensaje", fieldType: "textarea", required: true, options: [], order: 3 },
        ] },
      },
    }));
    await tx.contentBlock.create({ data: { pageId: page.id, type: "map", content: { address: ADDRESS }, position: 1, columnIndex: 0, columnWidth: 100, blockOrder: 0 } });
    await tx.contentBlock.update({ where: { id: old.id }, data: { type: "customForm", content: { formId: form.id }, position: 2 } });
  });
  console.log("✔ aplicado en el borrador; falta revisarlo en «Vista previa»");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
