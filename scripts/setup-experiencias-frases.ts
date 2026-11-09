/**
 * «Experiencias y Anécdotas» (borrador): reorganiza la página y añade el bloque «Frases»:
 *   sección 1: la cabecera (imagen + título), se queda como está
 *   sección 2: dos columnas: texto + botón a la izquierda, formulario a la derecha
 *   sección 3: «Frases» (20 frases de autores conocidos y proverbios, rotan de 3 en 3)
 * No publica ni toca el menú. Las frases son traducciones libres al español.
 *
 *   npx tsx scripts/setup-experiencias-frases.ts            # dry run
 *   npx tsx scripts/setup-experiencias-frases.ts --apply
 *
 * Idempotente: si ya hay un bloque de frases, no hace nada. Cierra esta página en el editor antes de --apply.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const QUOTES: { text: string; author: string }[] = [
  { text: "La experiencia no es lo que te sucede, sino lo que haces con lo que te sucede.", author: "Aldous Huxley" },
  { text: "La experiencia es una maestra dura: primero te pone el examen y después te da la lección.", author: "Vernon Law" },
  { text: "La vida solo puede entenderse hacia atrás, pero tiene que vivirse hacia adelante.", author: "Søren Kierkegaard" },
  { text: "Lo que se interpone en el camino se convierte en el camino.", author: "Marco Aurelio" },
  { text: "Siete veces al suelo, ocho veces de pie.", author: "Proverbio japonés" },
  { text: "Un mar en calma nunca hizo a un marinero experto.", author: "Proverbio inglés" },
  { text: "Es un error capital teorizar antes de tener datos.", author: "Arthur Conan Doyle (Sherlock Holmes)" },
  { text: "No todo lo que puede contarse cuenta, y no todo lo que cuenta puede contarse.", author: "William Bruce Cameron" },
  { text: "Una vida sin examen no merece ser vivida.", author: "Sócrates" },
  { text: "No soy un maestro, sino un despertador.", author: "Robert Frost" },
  { text: "Un mentor es alguien que te permite ver la esperanza que hay dentro de ti.", author: "Oprah Winfrey" },
  { text: "Coaching es liberar el potencial de una persona para maximizar su propio rendimiento: ayudarla a aprender en lugar de enseñarle.", author: "John Whitmore" },
  { text: "Si he visto más lejos, es porque estaba de pie sobre los hombros de gigantes.", author: "Isaac Newton" },
  { text: "Cuando muere un anciano, se quema una biblioteca.", author: "Amadou Hampâté Bâ" },
  { text: "Hasta que los leones tengan sus propios historiadores, las historias de caza seguirán glorificando al cazador.", author: "Proverbio africano" },
  { text: "No aprendemos de la experiencia; aprendemos de reflexionar sobre la experiencia.", author: "John Dewey (atribuida)" },
  { text: "No puedes controlar todo lo que te sucede, pero puedes decidir que no te reduzca.", author: "Maya Angelou" },
  { text: "Cuando ya no podemos cambiar una situación, el reto es cambiarnos a nosotros mismos.", author: "Viktor Frankl" },
  { text: "Lo que te trajo hasta aquí no te llevará hasta allí.", author: "Marshall Goldsmith" },
  { text: "Ganas fuerza, valor y confianza con cada experiencia en la que de verdad te detienes a mirar al miedo a la cara.", author: "Eleanor Roosevelt" },
];

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const page = await prisma.page.findUnique({ where: { slug: "experiencias-y-anecdotas" }, include: { blocks: true } });
  if (!page) throw new Error("No existe la página experiencias-y-anecdotas.");
  if (page.blocks.some((b) => b.type === "quotes")) { console.log("Ya hay un bloque de frases; no hago nada."); return; }
  const at = (type: string, position: number) => page.blocks.find((b) => b.type === type && b.position === position);
  const text = at("text", 1), link = at("link", 2), form = at("customForm", 3);
  if (page.blocks.length !== 5 || !at("image", 0) || !at("text", 0) || !text || !link || !form) throw new Error("La página no tiene la estructura esperada (cabecera, texto, botón, formulario); no la toco.");

  console.log("• sección 1 (cabecera: imagen + título): sin cambios");
  console.log("• sección 2: dos columnas 50/50: izquierda = texto + botón «Conoce más sobre mí»; derecha = formulario");
  console.log(`• sección 3: bloque «Frases» con ${QUOTES.length} frases (rotan, 3 a la vez, cada 7 s):`);
  for (const q of QUOTES) console.log(`     «${q.text.slice(0, 60)}${q.text.length > 60 ? "…" : ""}» — ${q.author}`);
  console.log(`• estado: ${page.status} (no se publica ni se añade al menú)`);
  if (!APPLY) return;

  await prisma.$transaction(async (tx) => {
    await tx.contentBlock.update({ where: { id: text.id }, data: { columnIndex: 0, columnWidth: 50, blockOrder: 0 } });
    await tx.contentBlock.update({ where: { id: link.id }, data: { position: 1, columnIndex: 0, columnWidth: 50, blockOrder: 1 } });
    await tx.contentBlock.update({ where: { id: form.id }, data: { position: 1, columnIndex: 1, columnWidth: 50, blockOrder: 0 } });
    await tx.contentBlock.create({
      data: {
        pageId: page.id, type: "quotes", position: 2, columnIndex: 0, columnWidth: 100, blockOrder: 0,
        content: { title: "Frases para seguir pensando", quotes: QUOTES, autoplay: true, intervalSeconds: 7 },
      },
    });
  });
  console.log("✔ aplicado en el borrador; falta revisarlo en «Vista previa»");
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
