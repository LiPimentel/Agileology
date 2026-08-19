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

export async function getPublicNavPages() {
  return prisma.page.findMany({
    where: { status: "published", showInMenu: true, menuVisible: true },
    orderBy: { menuOrder: "asc" },
    select: { title: true, slug: true },
  });
}
