/** Checks for the widget host address rules. Run: npx tsx scripts/check-embed-origin.ts */
import { embedAncestors, parseOrigin, resolveEmbedOrigin } from "../src/lib/embedOrigin";

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "✔" : "✗"} ${m}`); if (!c) fails++; };
const site = "https://agileologywave.com";
ok(resolveEmbedOrigin("https://embed.agileologywave.com", site) === "https://embed.agileologywave.com", "subdominio embed válido");
ok(resolveEmbedOrigin("https://embed.agileologywave.com/ruta", site) === "https://embed.agileologywave.com", "se queda solo con el origen");
ok(resolveEmbedOrigin("https://agileologywave.com", site) === null, "el mismo origen que el sitio se rechaza (sería inseguro)");
ok(resolveEmbedOrigin("https://www.agileologywave.com", site) === null, "www del mismo sitio se rechaza");
ok(resolveEmbedOrigin("", site) === null && resolveEmbedOrigin(undefined, site) === null, "sin configurar = apagado");
ok(resolveEmbedOrigin("javascript:alert(1)", site) === null && resolveEmbedOrigin("ftp://x.com", site) === null, "solo http/https");
ok(parseOrigin("https://user:pass@evil.example") === null, "sin usuario ni contraseña en la dirección");
ok(resolveEmbedOrigin("http://lissettes-macbook-pro.tail828d59.ts.net:3000", "http://100.123.85.59:3000") !== null, "prueba por Tailscale: otro nombre, mismo servidor, es otro origen");
ok(embedAncestors(site).includes("https://www.agileologywave.com") && embedAncestors(site).includes(site), "quien puede enmarcar: el sitio con y sin www");
ok(embedAncestors("http://100.123.85.59:3000").join() === "http://100.123.85.59:3000", "en pruebas por IP: solo esa dirección");
ok(embedAncestors(undefined).length === 0, "sin dirección del sitio nadie puede enmarcarlo");
process.exit(fails ? 1 : 0);
