/**
 * 301 redirects from the old Wix URLs to their new homes.
 *
 * Plain data on purpose (not in next.config.ts): add or fix a line here and nothing
 * else needs to change. Paths are written exactly as Wix served them, accents included;
 * the matcher in src/lib/redirects.ts ignores accents, case and a trailing slash, so
 * `/sobre-mí`, `/sobre-m%C3%AD` and `/sobre-mi/` all resolve to the same entry.
 *
 * Two old sites are covered, and their path namespaces do not collide:
 *  - agileologywave.com (current Wix site)
 *  - lisspim.wixsite.com/scrumtia (2020–2021 blog)
 */
export type RedirectRule = { from: string; to: string };

export const REDIRECTS: readonly RedirectRule[] = [
  // ── Posts: agileologywave.com ──
  { from: "/post/decisiones-claras-clave-para-equipos-efectivos", to: "/blog/decisiones-claras-clave-para-equipos-efectivos" },
  { from: "/post/menos-improvisación-más-resultados-en-equipos-ágiles", to: "/blog/menos-improvisacion-mas-resultados-en-equipos-agiles" },
  { from: "/post/transformando-equipos-agilidad-sin-caos", to: "/blog/transformando-equipos-agilidad-sin-caos" },

  // ── Posts: scrumtia (2020–2021) ──
  { from: "/post/metodologías-ágiles", to: "/blog/metodologias-agiles-marcos-agiles" },
  { from: "/post/agile-manifesto", to: "/blog/agile-manifesto" },
  { from: "/post/kanban", to: "/blog/kanban" },
  { from: "/post/extreme-programming-xp", to: "/blog/extreme-programming-xp" },
  { from: "/post/los-4-valores-del-manifiesto-ágil", to: "/blog/los-4-valores-del-manifiesto-agil" },
  // The original Wix slug had a typo ("loa-…") and no "-parte-1"; the new slug fixes both.
  { from: "/post/loa-12-principios-del-manifiesto-ágil", to: "/blog/los-12-principios-del-manifiesto-agil-parte-1" },
  { from: "/post/los-12-principios-del-manifiesto-ágil-parte-2", to: "/blog/los-12-principios-del-manifiesto-agil-parte-2" },
  { from: "/post/scrum-historia", to: "/blog/scrum-historia" },
  { from: "/post/scrum-definición-teoría-y-valores", to: "/blog/scrum-definicion-teoria-y-valores" },
  { from: "/post/scrum-equipo", to: "/blog/scrum-equipo" },
  { from: "/post/scrum-eventos-y-o-ceremonias", to: "/blog/scrum-eventos-y-o-ceremonias" },
  { from: "/post/scrum-artefactos", to: "/blog/scrum-artefactos" },
  { from: "/post/sprint-grooming-o-refinamiento", to: "/blog/sprint-grooming-o-refinamiento" },
  { from: "/post/errores-que-se-cometen-dentro-del-marco-scrum", to: "/blog/errores-que-se-cometen-dentro-del-marco-scrum" },

  // ── Pages: agileologywave.com ──
  { from: "/sobre-mí", to: "/sobre-mi" },
  { from: "/contact-4", to: "/contacto" },
  { from: "/experiencias-y-anécdotas", to: "/experiencias-y-anecdotas" },

  // ── Pages: scrumtia ──
  { from: "/aboutme", to: "/sobre-mi" },
  { from: "/contacto-1", to: "/contacto" },
  { from: "/vivencias", to: "/experiencias-y-anecdotas" },
];
