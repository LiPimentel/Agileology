/** Checks for the security helpers (run: npx tsx scripts/check-security-helpers.ts). */
import Module from "node:module";
type Loader = { _load: (request: string, ...rest: unknown[]) => unknown };
const loader = Module as unknown as Loader;
const realLoad = loader._load;
loader._load = function (request: string, ...rest: unknown[]) { return request === "server-only" ? {} : realLoad.call(this, request, ...rest); };

let fails = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "✔" : "✘"} ${name}${extra ? ` — ${extra}` : ""}`); if (!ok) fails++; };

async function main() {
  process.env.DATABASE_URL ??= "postgresql://check:check@localhost:5432/check"; // never connects: only loading modules
  process.env.TWO_FACTOR_KEY = "a".repeat(64);
  const { encryptTwoFactorSecret, decryptTwoFactorSecret } = await import("../src/lib/twoFactorCrypto");
  const secret = "JBSWY3DPEHPK3PXP";
  const enc = encryptTwoFactorSecret(secret);
  check("2FA: se cifra y se lee de vuelta", enc.startsWith("v1:") && decryptTwoFactorSecret(enc) === secret);
  check("2FA: el texto cifrado no contiene el secreto", !enc.includes(secret));
  check("2FA: dos cifrados del mismo secreto son distintos (IV aleatorio)", encryptTwoFactorSecret(secret) !== enc);
  check("2FA: valores antiguos en claro se siguen leyendo", decryptTwoFactorSecret(secret) === secret);
  const tampered = enc.slice(0, -3) + (enc.endsWith("AAA") ? "BBB" : "AAA");
  let rejected = false; try { decryptTwoFactorSecret(tampered); } catch { rejected = true; }
  check("2FA: un valor manipulado se rechaza", rejected);
  for (const bad of ["change-me", "replace-with-a-long-random-string", "corta", "x".repeat(40) + "password"]) {
    process.env.TWO_FACTOR_KEY = bad;
    let refused = false; try { encryptTwoFactorSecret(secret); } catch { refused = true; }
    check(`2FA: rechaza una clave débil o de ejemplo (${bad.slice(0, 14)}…)`, refused);
  }
  process.env.TWO_FACTOR_KEY = "b".repeat(64);
  rejected = false; try { decryptTwoFactorSecret(enc); } catch { rejected = true; }
  check("2FA: con otra clave no se puede leer", rejected);

  const { hashSessionToken } = await import("../src/lib/session-db");
  const h = hashSessionToken("token-de-prueba");
  check("Sesión: el hash es SHA-256 en hexadecimal y no contiene el token", /^[0-9a-f]{64}$/.test(h) && !h.includes("token"));
  check("Sesión: es determinista y distinto por token", hashSessionToken("token-de-prueba") === h && hashSessionToken("otro") !== h);

  const { clientIp } = await import("../src/lib/clientIp");
  const hd = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });
  delete process.env.TRUSTED_IP_HEADER;
  check("IP: sin proxy de confianza usa el primer X-Forwarded-For", clientIp(hd({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })) === "203.0.113.9");
  check("IP: descarta valores que no son IP", clientIp(hd({ "x-forwarded-for": "<script>" })) === "unknown");
  process.env.TRUSTED_IP_HEADER = "cf-connecting-ip";
  check("IP: con Cloudflare solo cree a cf-connecting-ip", clientIp(hd({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4" })) === "198.51.100.7");
  check("IP: con Cloudflare ignora X-Forwarded-For falsificado", clientIp(hd({ "x-forwarded-for": "1.2.3.4" })) === "unknown");
  check("IP: acepta IPv6", clientIp(hd({ "cf-connecting-ip": "2001:db8::1" })) === "2001:db8::1");

  const { rateLimit, seenRecently } = await import("../src/lib/rateLimit");
  check("Límite: permite hasta el máximo y luego bloquea", [1, 2, 3].every(() => rateLimit("k", 3, 1000)) && !rateLimit("k", 3, 1000));
  check("Límite: claves distintas no se afectan", rateLimit("otra", 3, 1000));
  check("Código de un solo uso: la segunda vez se detecta", !seenRecently("x:123456", 1000) && seenRecently("x:123456", 1000));

  const { buildCsp } = await import("../src/lib/csp");
  const csp = buildCsp("NONCE", { https: false, dev: false });
  check("CSP: scripts solo con nonce y sin 'unsafe-inline' en script-src", /script-src 'self' 'nonce-NONCE' 'strict-dynamic'/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp));
  check("CSP: ninguna página puede ir en un marco ajeno", csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"));
  check("CSP: sin https no fuerza la mejora a https", !csp.includes("upgrade-insecure-requests") && buildCsp("N", { https: true, dev: false }).includes("upgrade-insecure-requests"));
  check("CSP: sin 'unsafe-eval' en producción", !csp.includes("unsafe-eval") && buildCsp("N", { https: false, dev: true }).includes("unsafe-eval"));
  check("CSP: el mapa solo se permite bajo google.com/maps/", csp.includes("https://www.google.com/maps/") && !/google\.com[ ;]/.test(csp.replace("https://www.google.com/maps/", "")));
  process.exit(fails ? 1 : 0);
}
main();
