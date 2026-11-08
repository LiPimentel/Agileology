/** Checks for the public address rules (run: npx tsx scripts/check-site-url.ts). */
import { normalizePublicUrl, canonicalRedirectTarget, isIpOrLocalHost } from "../src/lib/siteUrl";

let fails = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "✔" : "✘"} ${name}${extra ? ` — ${extra}` : ""}`); if (!ok) fails++; };
const n = (s: string) => normalizePublicUrl(s);

check("acepta https://agileologywave.com/", (n("https://agileologywave.com/") as { url: string }).url === "https://agileologywave.com");
check("sin esquema asume https", (n("AgileologyWave.com") as { url: string }).url === "https://agileologywave.com");
check("conserva http para pruebas", (n("http://100.123.85.59:3000") as { url: string }).url === "http://100.123.85.59:3000");
for (const [name, v] of [["vacío", ""], ["con ruta", "https://agileologywave.com/blog"], ["con parámetros", "https://agileologywave.com/?a=1"], ["con usuario", "https://user:pw@agileologywave.com"], ["esquema javascript", "javascript:alert(1)"], ["con espacios", "agileology wave.com"], ["sin punto", "https://agileologywave"], ["ftp", "ftp://agileologywave.com"]] as const) {
  check(`rechaza ${name}`, !n(v).ok, v);
}
check("reconoce IP y localhost", isIpOrLocalHost("100.123.85.59") && isIpOrLocalHost("localhost") && !isIpOrLocalHost("agileologywave.com"));

const o = { publicUrl: "https://agileologywave.com", search: "?x=1" };
check("apex: www → sin www (301)", canonicalRedirectTarget({ ...o, host: "www.agileologywave.com", pathname: "/blog", canonicalHost: "apex" }) === "https://agileologywave.com/blog?x=1");
check("www: sin www → con www", canonicalRedirectTarget({ ...o, host: "agileologywave.com", pathname: "/", canonicalHost: "www" }) === "https://www.agileologywave.com/?x=1");
check("ya está en el host correcto: no redirige", canonicalRedirectTarget({ ...o, host: "agileologywave.com", pathname: "/", canonicalHost: "apex" }) === null);
check("sin preferencia: no redirige", canonicalRedirectTarget({ ...o, host: "www.agileologywave.com", pathname: "/", canonicalHost: "none" }) === null);
check("otros hosts (IP, localhost, admin.) nunca se redirigen", ["100.123.85.59:3000", "localhost:3000", "admin.agileologywave.com", "evil.com"].every((h) => canonicalRedirectTarget({ ...o, host: h, pathname: "/", canonicalHost: "apex" }) === null));
check("ignora el puerto del host pedido", canonicalRedirectTarget({ ...o, host: "www.agileologywave.com:443", pathname: "/", canonicalHost: "apex" }) !== null);
check("si la dirección pública es una IP no redirige", canonicalRedirectTarget({ publicUrl: "http://100.123.85.59:3000", search: "", host: "www.x.com", pathname: "/", canonicalHost: "apex" }) === null);
check("sin dirección pública no redirige", canonicalRedirectTarget({ publicUrl: null, search: "", host: "www.agileologywave.com", pathname: "/", canonicalHost: "apex" }) === null);
check("con dirección http no redirige (nunca baja de https a http)", canonicalRedirectTarget({ publicUrl: "http://ejemplo.com", search: "", host: "www.ejemplo.com", pathname: "/", canonicalHost: "apex" }) === null);
process.exit(fails ? 1 : 0);
