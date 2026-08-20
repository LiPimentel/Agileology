import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Records a page visit for the analytics dashboard (RF-24). */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`visit:${ip}`, 60, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.slice(0, 500) : null;
  if (!path) return NextResponse.json({ ok: false }, { status: 400 });
  const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;

  const page = await prisma.page.findFirst({
    where: { slug: path === "/" ? "home" : path.replace(/^\//, "") },
    select: { id: true },
  });

  await prisma.visitLog.create({
    data: { path, referrer, pageId: page?.id ?? null },
  });

  return NextResponse.json({ ok: true });
}
