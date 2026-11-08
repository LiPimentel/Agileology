import "server-only";
import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { isIpOrLocalHost } from "@/lib/siteUrl";

export type CheckStatus = "ok" | "warn" | "fail" | "info";
export type Check = { id: string; label: string; status: CheckStatus; detail: string };

/** Private, loopback, link-local and Tailscale/CGNAT ranges: never fetched from the server (no probing of internal addresses). */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
}

const resolver = () => {
  const r = new Resolver({ timeout: 3000, tries: 1 });
  return r;
};

async function tryResolve<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/** Runs every check; each one is independent and never throws. */
export async function runDomainChecks(publicUrl: string | null): Promise<Check[]> {
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // 1. Address
  if (!publicUrl) {
    add({ id: "url", label: "Dirección pública", status: "fail", detail: "Todavía no hay una dirección pública guardada. Guárdala arriba." });
  } else {
    add({ id: "url", label: "Dirección pública", status: "ok", detail: publicUrl });
    add(
      publicUrl.startsWith("https://")
        ? { id: "https", label: "Conexión segura (HTTPS)", status: "ok", detail: "La dirección empieza por https://." }
        : { id: "https", label: "Conexión segura (HTTPS)", status: "warn", detail: "La dirección es http://: sirve para pruebas, pero un sitio público debe usar https://." },
    );
  }

  // 2. DNS + 3. reachability (only for a real domain name)
  let host = "";
  try {
    host = publicUrl ? new URL(publicUrl).hostname : "";
  } catch {
    host = "";
  }
  if (host && !isIpOrLocalHost(host)) {
    const r = resolver();
    const [a, aaaa, cname, ns] = await Promise.all([
      tryResolve(() => r.resolve4(host)),
      tryResolve(() => r.resolve6(host)),
      tryResolve(() => r.resolveCname(host)),
      tryResolve(() => r.resolveNs(host.replace(/^www\./, ""))),
    ]);
    const addresses = [...(a ?? []), ...(aaaa ?? [])];
    const onWix = (a ?? []).some((ip) => ip.startsWith("185.230.63.")) || (cname ?? []).some((c) => c.includes("wixdns.net"));
    const onCloudflareDns = (ns ?? []).some((n) => n.toLowerCase().endsWith("cloudflare.com"));
    if (addresses.length === 0 && !(cname && cname.length)) {
      add({ id: "dns", label: "El dominio apunta a algún sitio", status: "fail", detail: `${host} no resuelve a ninguna dirección. Revisa los registros DNS.` });
    } else if (onWix) {
      add({ id: "dns", label: "El dominio apunta a algún sitio", status: "info", detail: `${host} todavía apunta a Wix (${addresses.join(", ") || cname?.join(", ")}). Es lo esperado hasta el día del cambio.` });
    } else {
      add({ id: "dns", label: "El dominio apunta a algún sitio", status: "ok", detail: `${host} → ${addresses.join(", ") || cname?.join(", ")}` });
    }
    add(
      onCloudflareDns
        ? { id: "ns", label: "Servidores de nombres", status: "ok", detail: `En Cloudflare (${(ns ?? []).join(", ")}).` }
        : { id: "ns", label: "Servidores de nombres", status: "info", detail: ns?.length ? `Con ${ns.join(", ")}. Para usar el túnel y Cloudflare Access deben ser los de Cloudflare.` : "No se pudieron leer." },
    );

    const publicIps = addresses.filter((ip) => !isPrivateAddress(ip));
    if (addresses.length > 0 && publicIps.length === 0) {
      add({ id: "reach", label: "El dominio llega a esta aplicación", status: "info", detail: "El dominio apunta a una dirección privada: no se puede verificar desde el servidor." });
    } else if (publicUrl?.startsWith("https://") && !onWix && addresses.length > 0) {
      try {
        const res = await fetch(`${publicUrl}/api/health`, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(6000), headers: { "User-Agent": "agileology-domain-check" } });
        const body = res.ok ? await res.json().catch(() => null) : null;
        if (res.ok && body?.status === "ok") add({ id: "reach", label: "El dominio llega a esta aplicación", status: "ok", detail: "La dirección responde y es esta aplicación, con la base de datos funcionando." });
        else add({ id: "reach", label: "El dominio llega a esta aplicación", status: "warn", detail: `Responde (código ${res.status}), pero no parece ser esta aplicación. ¿Sigue apuntando a otro sitio?` });
      } catch {
        add({ id: "reach", label: "El dominio llega a esta aplicación", status: "fail", detail: "No se pudo conectar a la dirección pública. Revisa el túnel y que el sitio esté encendido." });
      }
    } else if (onWix) {
      add({ id: "reach", label: "El dominio llega a esta aplicación", status: "info", detail: "Aún no: el dominio todavía es de Wix." });
    }
  } else if (host) {
    add({ id: "dns", label: "El dominio apunta a algún sitio", status: "info", detail: "La dirección es una IP o un equipo local (modo pruebas): no hay dominio que comprobar." });
  }

  // 4. Security readiness
  const trusted = process.env.TRUSTED_IP_HEADER?.trim();
  const https = Boolean(publicUrl?.startsWith("https://"));
  add(
    trusted
      ? { id: "ip", label: "IP real de los visitantes", status: "ok", detail: `Se lee de la cabecera «${trusted}».` }
      : { id: "ip", label: "IP real de los visitantes", status: https ? "fail" : "warn", detail: "Falta TRUSTED_IP_HEADER (con Cloudflare: cf-connecting-ip). Sin ella, los límites de intentos se pueden esquivar." },
  );
  add(
    process.env.COOKIE_SECURE === "false"
      ? { id: "cookie", label: "Cookies seguras", status: https ? "fail" : "warn", detail: "COOKIE_SECURE=false: solo para pruebas por http. Al publicar debe quitarse." }
      : { id: "cookie", label: "Cookies seguras", status: "ok", detail: "La sesión viaja solo por HTTPS." },
  );
  const key = process.env.TWO_FACTOR_KEY ?? "";
  add(key.length >= 32 ? { id: "2fa-key", label: "Clave que cifra el 2FA", status: "ok", detail: "Definida. Tenla guardada también fuera del servidor." } : { id: "2fa-key", label: "Clave que cifra el 2FA", status: "fail", detail: "Falta TWO_FACTOR_KEY o es demasiado corta." });
  try {
    const without2fa = await prisma.admin.count({ where: { twoFactorEnabled: false } });
    add(without2fa === 0 ? { id: "2fa", label: "Verificación en dos pasos", status: "ok", detail: "Todas las cuentas de administrador la tienen activa." } : { id: "2fa", label: "Verificación en dos pasos", status: "fail", detail: `${without2fa} cuenta(s) de administrador sin 2FA.` });
    await prisma.$queryRaw`select 1`;
    add({ id: "db", label: "Base de datos", status: "ok", detail: "Responde." });
  } catch {
    add({ id: "db", label: "Base de datos", status: "fail", detail: "No responde." });
  }
  add({ id: "port", label: "Puerto de la aplicación", status: "info", detail: "Antes de publicar, comprueba desde otro equipo que http://IP-DEL-MAC:3000 NO responde (APP_BIND fuera del .env). El panel no puede verlo desde dentro." });
  add({ id: "backup", label: "Respaldo diario", status: "info", detail: "Corre en tu Mac a las 3:00. Revisa que la última línea de ~/Backups/agileology/backup.log empiece por OK." });
  return checks;
}
