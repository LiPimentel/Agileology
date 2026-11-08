import "server-only";
import { isHomeSlug } from "@/lib/home";
import { prisma } from "@/lib/prisma";

/**
 * Reads a one-row settings table, creating the row the first time. Two requests arriving together
 * on a brand-new database both try to create it; the loser re-reads instead of failing (the old
 * upsert threw a unique-constraint error there, and also wrote on every page view).
 */
async function ensureSingleton<T>(find: () => Promise<T | null>, create: () => Promise<T>): Promise<T> {
  const existing = await find();
  if (existing) return existing;
  try {
    return await create();
  } catch (err) {
    const raced = await find();
    if (raced) return raced;
    throw err;
  }
}

export async function getSiteSettings() {
  return ensureSingleton(
    () => prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    () => prisma.siteSettings.create({ data: { id: "singleton" } }),
  );
}

export async function getCommunicationSettings() {
  return ensureSingleton(
    () => prisma.communicationSettings.findUnique({ where: { id: "singleton" } }),
    () =>
      prisma.communicationSettings.create({
        data: {
          id: "singleton",
          chatDestinationEmail: process.env.CHAT_DESTINATION_EMAIL_DEFAULT ?? "",
          contactFormDestinationEmail: process.env.CONTACT_DESTINATION_EMAIL_DEFAULT ?? "",
        },
      }),
  );
}

export async function getBlogSettings() {
  return ensureSingleton(
    () => prisma.blogSettings.findUnique({ where: { id: "singleton" } }),
    () => prisma.blogSettings.create({ data: { id: "singleton" } }),
  );
}

export type NavLink = { label: string; href: string; newTab: boolean; children?: NavLink[] };

type MenuItemWithPage = Awaited<ReturnType<typeof prisma.menuItem.findMany<{ include: { page: { select: { slug: true; status: true } } } }>>>[number];

/**
 * Resolves one MenuItem row to a plain href, so Nav.tsx/Footer.tsx don't
 * need to know about the two link types (page vs. URL). An item whose
 * linked page was deleted or unpublished (linkType "page", pageId set, but
 * the join comes back empty/unpublished) resolves to null rather than a
 * broken link.
 */
function resolveMenuLink(item: MenuItemWithPage): NavLink | null {
  if (item.linkType === "page") {
    if (!item.page || item.page.status !== "published") return null;
    return { label: item.label, href: isHomeSlug(item.page.slug) ? "/" : `/${item.page.slug}`, newTab: item.newTab };
  }
  if (item.externalUrl) return { label: item.label, href: item.externalUrl, newTab: item.newTab };
  return null;
}

/**
 * The header nav, as explicitly configured by an admin at
 * /admin/settings/menu. Items with a parentId become that parent's
 * dropdown submenu (one level deep only -- enforced in saveMenuItems, not
 * here).
 */
export async function getMenuItems(): Promise<NavLink[]> {
  const items = await prisma.menuItem.findMany({
    where: { visible: true, location: "header" },
    orderBy: { order: "asc" },
    include: { page: { select: { slug: true, status: true } } },
  });

  const links: NavLink[] = [];
  for (const item of items) {
    if (item.parentId) continue; // attached to its parent below
    const link = resolveMenuLink(item);
    if (!link) continue;
    const childLinks = items
      .filter((c) => c.parentId === item.id)
      .map(resolveMenuLink)
      .filter((l): l is NavLink => l !== null);
    if (childLinks.length > 0) link.children = childLinks;
    links.push(link);
  }
  return links;
}

/**
 * Extra footer links (static pages like Terms/FAQ, or any URL) -- same
 * MenuItem table and admin editor as the header nav, just filtered to
 * location "footer" and always flat (footer links don't nest into
 * dropdowns).
 */
export async function getFooterLinks(): Promise<NavLink[]> {
  const items = await prisma.menuItem.findMany({
    where: { visible: true, location: "footer" },
    orderBy: { order: "asc" },
    include: { page: { select: { slug: true, status: true } } },
  });
  return items.map(resolveMenuLink).filter((l): l is NavLink => l !== null);
}
