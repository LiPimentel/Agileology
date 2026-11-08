/**
 * One-off: encrypts every administrator's 2FA secret that is still stored as plain base32.
 * Safe to run more than once (already-encrypted values are skipped) and the app keeps reading
 * both forms, so it can be run before or after deploying. Needs TWO_FACTOR_KEY (or SESSION_SECRET).
 *
 *   npx tsx scripts/encrypt-2fa-secrets.ts            # dry run
 *   npx tsx scripts/encrypt-2fa-secrets.ts --apply
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encryptTwoFactorSecret, decryptTwoFactorSecret } from "../src/lib/twoFactorCrypto";

const APPLY = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log(APPLY ? "MODO APLICAR" : "MODO DRY-RUN (no escribe nada)");
  const admins = await prisma.admin.findMany({ where: { twoFactorSecret: { not: null } }, select: { id: true, email: true, twoFactorSecret: true } });
  let todo = 0;
  for (const a of admins) {
    const stored = a.twoFactorSecret!;
    if (stored.startsWith("v1:")) {
      console.log(`• ${a.email}: ya cifrado`);
      continue;
    }
    todo++;
    const enc = encryptTwoFactorSecret(stored);
    if (decryptTwoFactorSecret(enc) !== stored) throw new Error(`El cifrado de ${a.email} no se puede leer de vuelta; no escribo nada.`);
    console.log(`• ${a.email}: ${APPLY ? "cifrando" : "se cifraría"}`);
    if (APPLY) await prisma.admin.update({ where: { id: a.id }, data: { twoFactorSecret: enc } });
  }
  console.log(todo === 0 ? "Nada que hacer." : APPLY ? `✔ ${todo} cifrados y verificados` : `${todo} por cifrar`);
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
