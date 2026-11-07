/**
 * The home page is stored under slug "home" in a fresh install, but the migrated Wix site
 * calls it "inicio". Both mean "/" so the site works with either.
 */
export const HOME_SLUGS = ["home", "inicio"] as const;

export function isHomeSlug(slug: string): boolean {
  return (HOME_SLUGS as readonly string[]).includes(slug);
}
