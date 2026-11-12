/** Checks for the three-column page grid (sectionZone). Run: npx tsx scripts/check-side-rails.ts */
import { buildLayoutItems, zoneOf } from "../src/lib/pageLayout";

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "✔" : "✗"} ${m}`); if (!c) fails++; };
const z = (...zones: unknown[]) => buildLayoutItems(zones, (x) => x);

ok(z(undefined, "full", null).every((i) => i.kind === "full"), "sin zonas todo queda a ancho completo (páginas existentes sin cambios)");
ok(zoneOf("<script>") === "full" && zoneOf(42) === "full" && zoneOf("") === "full", "una zona desconocida es ancho completo");
const a = z("full", "left", "main", "main", "full");
ok(a.length === 3 && a[0].kind === "full" && a[1].kind === "grid" && a[2].kind === "full", "el video arriba y el pie abajo rodean UNA cuadrícula");
ok(a[1].kind === "grid" && a[1].sections.map((s) => s.index).join() === "1,2,3", "la cuadrícula conserva el orden y los índices");
ok(a[1].kind === "grid" && a[1].sections.map((s) => s.zone).join() === "left,main,main", "cada sección conserva su zona");
const b = z("main", "full", "main");
ok(b.length === 3 && b[0].kind === "grid" && b[2].kind === "grid", "una sección de ancho completo corta la cuadrícula en dos");
ok(z("right", "left", "main").length === 1, "izquierda, centro y derecha en cualquier orden son una sola cuadrícula");
process.exit(fails ? 1 : 0);
