import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPageBySlug } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { PageRenderer } from "@/components/public/PageRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPublishedPageBySlug("home"), getSiteSettings()]);
  return {
    title: page?.seoTitle ?? settings.siteTitle,
    description: page?.seoDescription ?? settings.defaultMetaDescription ?? undefined,
  };
}

export default async function HomePage() {
  const page = await getPublishedPageBySlug("home");
  if (!page) notFound();
  return <PageRenderer page={page.snapshot} />;
}
