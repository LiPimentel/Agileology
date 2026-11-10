/**
 * Stable short URLs on this site that send visitors to Lissette's own apps (hosted elsewhere).
 *
 * The apps are NOT mounted inside this site: each path answers with a 302 (temporary, never 301:
 * the destinations will move to subdomains of agileologywave.com and a 301 would stay cached in
 * browsers and search engines). When an app gets its subdomain, only the `to` here changes.
 * Destinations are fixed absolute https URLs; nothing from the request is copied into them.
 *
 * Future subdomains: mytravel. / gantt. / hourglass. / nutrilog. / lpbag. / vitr. + agileologywave.com
 */
export type AppLink = { from: string; to: string };

export const APP_LINKS: readonly AppLink[] = [
  { from: "/mytravel", to: "https://lips-hub.lissette2402.workers.dev/mytravel-pro-v4" },
  { from: "/gantt", to: "https://lips-hub.lissette2402.workers.dev/generador_gantt_2" },
  { from: "/hourglass", to: "https://lips-hub.lissette2402.workers.dev/hourglass" },
  { from: "/nutrilog", to: "https://lips-hub.lissette2402.workers.dev/nutri-log" },
  { from: "/lpbag", to: "https://lips-hub.lissette2402.workers.dev/lpbag" },
  { from: "/vitr", to: "https://vitr.lissette2402.workers.dev/" },
];
