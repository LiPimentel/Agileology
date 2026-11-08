/** Checks for the SEO fallback rule (run: npx tsx scripts/check-seo.ts). */
import { resolveSeo, SEO_TITLE_MAX, SEO_DESCRIPTION_MAX } from "../src/lib/seo";

let fails = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "✔" : "✘"} ${name}${extra ? ` — ${extra}` : ""}`); if (!ok) fails++; };
const base = { pageTitle: "Sobre mí", seoTitle: null, seoDescription: null, siteTitle: "Agileology", defaultDescription: "Coaching ágil.", isHome: false };

const own = resolveSeo({ ...base, seoTitle: "Quién soy", seoDescription: "Mi historia." });
check("título y descripción propios ganan", own.title === "Quién soy" && own.titleSource === "own" && own.description === "Mi historia." && own.descriptionSource === "own");
const none = resolveSeo(base);
check("sin título propio usa el nombre de la PÁGINA (antes salía solo el del sitio)", none.title === "Sobre mí" && none.titleSource === "page");
check("sin descripción propia usa la del sitio", none.description === "Coaching ágil." && none.descriptionSource === "default");
check("la portada sin título propio usa el nombre del sitio", resolveSeo({ ...base, pageTitle: "Inicio", isHome: true }).title === "Agileology");
const bare = resolveSeo({ ...base, defaultDescription: "" });
check("sin descripción propia ni por defecto, queda sin descripción", bare.description === undefined && bare.descriptionSource === "none");
check("los espacios solos cuentan como vacío", resolveSeo({ ...base, seoTitle: "   ", seoDescription: "  " }).titleSource === "page");
check("los límites recomendados son 60 y 160", SEO_TITLE_MAX === 60 && SEO_DESCRIPTION_MAX === 160);
process.exit(fails ? 1 : 0);
