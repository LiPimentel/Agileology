import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A minimal page that hosts one Elfsight LinkedIn Feed widget. The public pages show it inside a
 * sandboxed <iframe> (no same-origin), so Elfsight's scripts never run in the site's own pages. Only
 * widget ids that an editor really saved in a "Publicaciones de LinkedIn" block are served, so this
 * is not a way to show somebody else's widget under this domain. The CSP for this path is set in
 * proxy.ts (buildEmbedCsp).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const notFound = () => new Response("No encontrado", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });
  if (!UUID.test(id)) return notFound();
  const used = await prisma.contentBlock.findFirst({ where: { type: "linkedinPosts", content: { path: ["elfsightId"], equals: id.toLowerCase() } }, select: { id: true } });
  if (!used) return notFound();

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Publicaciones de LinkedIn</title><style>html,body{margin:0;background:transparent}</style></head><body><script src="https://static.elfsight.com/platform/platform.js" async></script><div class="elfsight-app-${id.toLowerCase()}" data-elfsight-app-lazy></div></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}
