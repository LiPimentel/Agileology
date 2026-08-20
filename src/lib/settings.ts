import "server-only";
import { prisma } from "@/lib/prisma";

export async function getSiteSettings() {
  return prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function getCommunicationSettings() {
  return prisma.communicationSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      chatDestinationEmail: process.env.CHAT_DESTINATION_EMAIL_DEFAULT ?? "",
      contactFormDestinationEmail: process.env.CONTACT_DESTINATION_EMAIL_DEFAULT ?? "",
    },
  });
}

export async function getBlogSettings() {
  return prisma.blogSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export type NavLink = { label: string; href: string; newTab: boolean; children?: NavLink[] };

/**
 * The header nav, as explicitly configured by an admin at
 * /admin/settings/menu -- items point at either an internal page or any
 * URL. Resolves each item to a plain href here so Nav.tsx doesn't need to
 * know about the two link types; an item whose linked page was deleted or
 * unpublished (linkType "page", pageId set, but the join comes back empty/
 * unpublished) is skipped rather than rendered as a broken link.
 *
 * Items with a parentId become that parent's dropdown submenu (one level
 * deep only -- enforced in saveMenuItems, not here).
 */
export async function getMenuItems(): Promise<NavLink[]> {
  const items = await prisma.menuItem.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
    include: { page: { select: { slug: true, status: true } } },
  });

  function resolve(item: (typeof items)[number]): NavLink | null {
    if (item.linkType === "page") {
      if (!item.page || item.page.status !== "published") return null;
      return { label: item.label, href: item.page.slug === "home" ? "/" : `/${item.page.slug}`, newTab: item.newTab };
    }
    if (item.externalUrl) return { label: item.label, href: item.externalUrl, newTab: item.newTab };
    return null;
  }

  const links: NavLink[] = [];
  for (const item of items) {
    if (item.parentId) continue; // attached to its parent below
    const link = resolve(item);
    if (!link) continue;
    const childLinks = items
      .filter((c) => c.parentId === item.id)
      .map(resolve)
      .filter((l): l is NavLink => l !== null);
    if (childLinks.length > 0) link.children = childLinks;
    links.push(link);
  }
  return links;
}
