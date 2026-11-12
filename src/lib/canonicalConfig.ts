import { prisma } from "@/lib/prisma";

type Config = { publicUrl: string | null; canonicalHost: string };

// The proxy asks on every request; the answer changes only when an admin saves the domain screen,
// so a short cache keeps it from hitting the database each time. A failure never breaks the site:
// it just means "no redirect" for that request.
let cached: { at: number; value: Config | null } | null = null;
const TTL_MS = 30_000;

export async function getCanonicalConfig(): Promise<Config | null> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { publicUrl: true, canonicalHost: true } });
    cached = { at: now, value: row };
  } catch {
    cached = { at: now, value: null };
  }
  return cached.value;
}
