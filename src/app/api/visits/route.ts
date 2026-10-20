import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Records a page visit (RF-24) OR an in-page click event -- same endpoint,
 * distinguished by eventType, since both are just "something happened at
 * this path" rows on the same VisitLog table. Clicks are for interactions
 * that don't necessarily produce their own pageview (chat widget opened, a
 * WhatsApp/phone/social link, a CTA button) -- "quiero ver... click dentro
 * del sitio" in the analytics dashboard.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`visit:${ip}`, 60, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.slice(0, 500) : null;
  if (!path) return NextResponse.json({ ok: false }, { status: 400 });
  const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;
  const eventType = body?.eventType === "click" ? "click" : "pageview";
  const label = typeof body?.label === "string" ? body.label.slice(0, 200) : null;

  const page = await prisma.page.findFirst({
    where: { slug: path === "/" ? "home" : path.replace(/^\//, "") },
    select: { id: true },
  });

  await prisma.visitLog.create({
    data: { path, referrer, pageId: page?.id ?? null, eventType, label },
  });

  return NextResponse.json({ ok: true });
}
