/**
 * «Experiencias y Anécdotas» (borrador) como la página «Vivencias» del Wix de pruebas:
 * cabecera con imagen + título + subtítulo, texto de introducción, invitación con botón a «Sobre mí»
 * y el formulario existente con apellido y la pregunta de anonimato. Los 3 testimonios de plantilla
 * de Wix NO se copian. No publica ni toca el menú.
 *
 *   npx tsx scripts/setup-vivencias.ts            # dry run
 *   npx tsx scripts/setup-vivencias.ts --apply
 *
 * Idempotente: si la página ya tiene una imagen, no hace nada. Cierra esta página en el editor antes de --apply.
 */
import "dotenv/config";
import path from "node:path";
import { mkdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const UPLOAD_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve("uploads");
const IMG_URL = "https://static.wixstatic.com/media/8121cd0609b8412497001bae77b1af31.jpg";
const MARKER = "Wix: vivencias (Girl with Tablet)";
const FORM_NAME = "Comparte tu experiencia";
const ANON = "¿Deseas que tu experiencia sea compartida de forma anónima?";

const HEAD_HTML = "<h2>Lo que no se cuenta en el CV</h2><h3>Dentro y fuera de lo Agile</h3>";
const BODY_HTML =
  "<p>Aquí podrás encontrar una recopilación de algunas de mis propias experiencias, así como anécdotas de colegas y otros casos conocidos, sobre lo que se vive día a día en este mundo de transformación digital dentro y fuera de lo que es Agile.</p>" +
  "<h3>Vivencias: bienvenidxs</h3>" +
  "<p>¿Quieres contarme alguna experiencia que hayas tenido en el ámbito laboral? ¿Cómo la afrontaste? ¿Qué aprendiste de ella?</p>" +
  "<p>O tal vez quieras compartir una anécdota personal que dejó huella en ti.</p>" +
  "<p>¡Entonces no te limites! Estoy aquí para leerte y conversar.</p>" +
  "<p>Contáctame, estaré encantada de escucharte. 🤞</p>" +
  '<p><small>Tu correo no se publica. Solo mostraré tu historia si marcas la autorización. Más información en la <a href="/privacy-policy">política de privacidad</a>.</small></p>';

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "experiencias-y-anecdotas" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página experiencias-y-anecdotas.");
  if (page.blocks.some((b) => b.type === "image")) { console.log("La página ya tiene imagen; no hago nada."); return; }
  const text = page.blocks.find((b) => b.type === "text" && b.position === 0);
  const formBlock = page.blocks.find((b) => b.type === "customForm");
  if (page.blocks.length !== 2 || !text || !formBlock) throw new Error("La página no tiene la estructura esperada (texto + formulario); no la toco.");
  const form = await prisma.formDefinition.findFirst({ where: { name: FORM_NAME }, include: { fields: { orderBy: { order: "asc" } } } });
  if (!form) throw new Error(`No existe el formulario «${FORM_NAME}».`);
  const subs = await prisma.formSubmission.count({ where: { formId: form.id } });

  console.log(`• sección 0: imagen (columna 35%) + título «Lo que no se cuenta en el CV» y subtítulo «Dentro y fuera de lo Agile» (65%)`);
  console.log("• sección 1: introducción + invitación (texto de tu Wix, tal cual) + aviso de privacidad");
  console.log("• sección 2: botón «Conoce más sobre mí» → /sobre-mi");
  console.log(`• sección 3: el formulario «${FORM_NAME}» (${form.fields.length} campos, ${subs} respuestas ya recibidas que no se tocan)`);
  console.log(`• formulario: campo nuevo «Tu apellido» (opcional) y «${ANON}» (lista: Sí, de forma anónima / Sin anonimato)`);
  console.log(`• imagen: se descarga ${IMG_URL} y se guarda como webp en tu biblioteca. Es una foto de archivo de Wix: revisa que tengas derecho a usarla fuera de Wix.`);
  console.log(`• estado: ${page.status} (no se publica ni se añade al menú)`);
  if (!APPLY) return;

  const res = await fetch(IMG_URL);
  if (!res.ok) throw new Error(`No pude descargar la imagen (${res.status}).`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.webp`;
  const dest = path.join(UPLOAD_DIR, name);
  const info = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 85 }).toFile(dest);
  const st = await stat(dest);
  if (st.size === 0) throw new Error("La imagen quedó vacía.");
  const url = `/uploads/${name}`;

  await prisma.$transaction(async (tx) => {
    await tx.media.create({ data: { url, filename: name, mimeType: "image/webp", size: st.size, width: info.width, height: info.height, altText: MARKER } });
    const mk = (type: "image" | "text" | "link", content: object, position: number, columnIndex: number, columnWidth: number) =>
      tx.contentBlock.create({ data: { pageId: page.id, type, content, position, columnIndex, columnWidth, blockOrder: 0 } });
    await tx.contentBlock.update({ where: { id: text.id }, data: { content: { html: HEAD_HTML }, columnIndex: 1, columnWidth: 65 } });
    await mk("image", { url, altText: "Mujer trabajando con una tablet", alignment: "center", shape: "rounded", focalX: 50, focalY: 50, zoom: 1, frame: "auto", width: 100, hoverEffect: "none" }, 0, 0, 35);
    await mk("text", { html: BODY_HTML }, 1, 0, 100);
    await mk("link", { label: "Conoce más sobre mí", href: "/sobre-mi", internal: true, newTab: false }, 2, 0, 100);
    await tx.contentBlock.update({ where: { id: formBlock.id }, data: { position: 3 } });
    // Existing fields keep their ids (answers already received are keyed by them); only new ones are created.
    const byType = (t: string) => form.fields.filter((f) => f.fieldType === t);
    const [nameF, emailF, storyF] = [form.fields[0], form.fields.find((f) => f.fieldType === "email")!, form.fields.find((f) => f.fieldType === "textarea")!];
    const checkF = byType("checkbox");
    const mkField = (label: string, fieldType: string, required: boolean, options: string[] = []) =>
      tx.formField.create({ data: { formId: form.id, label, fieldType, required, placeholder: null, options, order: 0 } });
    const lastF = form.fields.find((f) => f.label === "Tu apellido") ?? (await mkField("Tu apellido", "text", false));
    const anonF = form.fields.find((f) => f.label === ANON) ?? (await mkField(ANON, "select", true, ["Sí, de forma anónima", "Sin anonimato"]));
    const ordered = [nameF, lastF, emailF, storyF, anonF, ...checkF];
    for (const [order, f] of ordered.entries()) await tx.formField.update({ where: { id: f.id }, data: { order } });
  });
  console.log(`✔ aplicado en el borrador (${url}); falta revisarlo en «Vista previa»`);
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
