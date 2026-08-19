import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const [pages, posts] = await Promise.all([
    prisma.page.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
  ]);

  const pageEntries = pages.map((p) => ({
    url: p.slug === "home" ? siteUrl || "/" : `${siteUrl}/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  const postEntries = posts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  return [{ url: siteUrl ? `${siteUrl}/blog` : "/blog", lastModified: new Date() }, ...pageEntries, ...postEntries];
}
