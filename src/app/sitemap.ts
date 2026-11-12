import type { MetadataRoute } from "next";
import { isHomeSlug } from "@/lib/home";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();

  const [pages, posts] = await Promise.all([
    prisma.page.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
  ]);

  const pageEntries = pages.map((p) => ({
    url: isHomeSlug(p.slug) ? siteUrl || "/" : `${siteUrl}/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  const postEntries = posts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  return [{ url: siteUrl ? `${siteUrl}/blog` : "/blog", lastModified: new Date() }, ...pageEntries, ...postEntries];
}
