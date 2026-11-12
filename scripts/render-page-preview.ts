/** Dev helper: renders the WORKING COPY of a page to static HTML (no login needed). Usage: npx tsx scripts/render-page-preview.ts <slug> <out.html> */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "../src/lib/prisma";
import { buildPageSnapshot } from "../src/lib/pages";
import { resolveDynamicBlocks } from "../src/lib/dynamicBlocks";
import { PageRenderer } from "../src/components/public/PageRenderer";

async function main() {
  const [slug, out] = process.argv.slice(2);
  const page = await prisma.page.findUnique({ where: { slug }, select: { id: true } });
  if (!page) throw new Error("No existe la página.");
  const snap = await buildPageSnapshot(page.id);
  if (!snap) throw new Error("Sin snapshot.");
  const blocks = await resolveDynamicBlocks(snap.blocks);
  const html = renderToStaticMarkup(createElement(PageRenderer, { page: { ...snap, blocks } }));
  writeFileSync(out, html);
  console.log("ok", html.length);
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
