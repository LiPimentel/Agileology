/**
 * What a page's title and description in search results / link previews really are, and where each
 * comes from. One rule shared by the public pages (generateMetadata) and the admin SEO screen, so
 * what the panel shows is what gets published. Pure: safe on server and client.
 *
 *   title:       the page's own SEO title  →  the page's name  →  (home) the site name
 *   description: the page's own SEO text   →  the site-wide default description
 */
export const SEO_TITLE_MAX = 60; // longer titles get cut in search results
export const SEO_DESCRIPTION_MAX = 160;

export type SeoInput = {
  pageTitle: string;
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  siteTitle: string;
  defaultDescription: string | null | undefined;
  isHome: boolean;
};

export type SeoResult = {
  title: string;
  titleSource: "own" | "page" | "site";
  description: string | undefined;
  descriptionSource: "own" | "default" | "none";
};

export function resolveSeo(i: SeoInput): SeoResult {
  const ownTitle = i.seoTitle?.trim();
  const ownDescription = i.seoDescription?.trim();
  const defaultDescription = i.defaultDescription?.trim();
  const title = ownTitle ? { value: ownTitle, source: "own" as const } : i.isHome ? { value: i.siteTitle, source: "site" as const } : { value: i.pageTitle, source: "page" as const };
  const description = ownDescription
    ? { value: ownDescription, source: "own" as const }
    : defaultDescription
      ? { value: defaultDescription, source: "default" as const }
      : { value: undefined, source: "none" as const };
  return { title: title.value, titleSource: title.source, description: description.value, descriptionSource: description.source };
}

/**
 * The title as it will really appear: the layout adds " — {site name}" to every page title, so a
 * title that already contains the site name (typed by hand, as in "Contacto — Agileology Wave") is
 * used as is instead of getting the name twice. `absolute` tells Next to skip the template.
 */
export function fullTitle(title: string, siteTitle: string, isHome: boolean): { text: string; absolute: boolean } {
  const hasSiteName = siteTitle.trim() !== "" && title.toLowerCase().includes(siteTitle.trim().toLowerCase());
  const absolute = isHome || hasSiteName;
  return { text: absolute ? title : `${title} — ${siteTitle}`, absolute };
}
