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

export type NavLink = { label: string; href: string; newTab: boolean };

/**
 * The header nav, as explicitly configured by an admin at
 * /admin/settings/menu -- items point at either an internal page or any
 * URL. Resolves each item to a plain href here so Nav.tsx doesn't need to
 * know about the two link types; an item whose linked page was deleted or
 * unpublished (linkType "page", pageId set, but the join comes back empty/
 * unpublished) is skipped rather than rendered as a broken link.
 */
export async function getMenuItems(): Promise<NavLink[]> {
  const items = await prisma.menuItem.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
    include: { page: { select: { slug: true, status: true } } },
  });

  const links: NavLink[] = [];
  for (const item of items) {
    if (item.linkType === "page") {
      if (!item.page || item.page.status !== "published") continue;
      links.push({ label: item.label, href: item.page.slug === "home" ? "/" : `/${item.page.slug}`, newTab: item.newTab });
    } else if (item.externalUrl) {
      links.push({ label: item.label, href: item.externalUrl, newTab: item.newTab });
    }
  }
  return links;
}
