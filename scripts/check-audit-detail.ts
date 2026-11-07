/** Sanity checks for audit-log detail helpers (run: npx tsx scripts/check-audit-detail.ts). */
import { diffBlocks, diffFields, parseAuditDetail, fmt, capChanges } from "../src/lib/auditDetail";

let fails = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "✔" : "✘"} ${name}${extra ? ` — ${extra}` : ""}`); if (!ok) fails++; };

const f = diffFields({ title: "Título", seoTitle: "Título SEO", status: "Estado" }, { title: "A", seoTitle: null, status: "Borrador" }, { title: "B", seoTitle: null, status: "Publicada" });
check("diffFields solo devuelve lo que cambió", f.length === 2 && f[0].from === "A" && f[0].to === "B" && f[1].to === "Publicada", JSON.stringify(f));
check("diffFields: null y vacío se muestran como —", fmt(null) === "—" && fmt("") === "—");
check("diffFields: fechas iguales no son cambio", diffFields({ d: "Fecha" }, { d: new Date("2026-01-01") }, { d: new Date("2026-01-01") }).length === 0);
check("fmt acorta textos largos", fmt("x".repeat(500)).length === 201);

const b1 = [{ type: "text", content: { html: "<p>Hola</p>" }, position: 0, columnIndex: 0, blockOrder: 0 }, { type: "image", content: { url: "/uploads/a.webp", altText: "Foto" }, position: 1, columnIndex: 0, blockOrder: 0 }];
const b2 = [{ type: "text", content: { html: "<p>Hola mundo</p>" }, position: 0, columnIndex: 0, blockOrder: 0 }, { type: "carousel", content: { slides: [1, 2, 3] }, position: 2, columnIndex: 0, blockOrder: 0 }];
const d = diffBlocks(b1, b2);
check("diffBlocks cuenta añadidos, modificados y eliminados", /1 añadido, 1 modificado, 1 eliminado/.test(d.summary), d.summary);
check("diffBlocks muestra antes y después del texto", d.changes.some((c) => c.from === "Hola" && c.to === "Hola mundo"));
check("diffBlocks sin cambios no genera nada", diffBlocks(b1, b1).changes.length === 0 && diffBlocks(b1, b1).summary === "");
check("parseAuditDetail lee JSON", parseAuditDetail('{"entity":"X","changes":[]}').entity === "X");
check("parseAuditDetail acepta texto antiguo", parseAuditDetail("abc123").text === "abc123");
check("parseAuditDetail con null", Object.keys(parseAuditDetail(null)).length === 0);
const many = Array.from({ length: 70 }, (_, i) => ({ field: `f${i}`, from: "a", to: "b" }));
check("capChanges limita a 60 más un aviso", capChanges(many).length === 61 && /10 cambios más/.test(capChanges(many)[60].to));
process.exit(fails ? 1 : 0);
