import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/settings";

// Reads the public address from the database, so it cannot be prepared at build time (no database there).
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }],
    sitemap: siteUrl ? `${siteUrl}/sitemap.xml` : undefined,
  };
}
