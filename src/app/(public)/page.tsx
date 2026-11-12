import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPageBySlug } from "@/lib/pages";
import { HOME_SLUGS } from "@/lib/home";
import { resolveSeo } from "@/lib/seo";
import { resolveDynamicBlocks } from "@/lib/dynamicBlocks";
import { getSiteSettings } from "@/lib/settings";
import { PageRenderer } from "@/components/public/PageRenderer";

export const dynamic = "force-dynamic";

async function getHomePage() {
  for (const slug of HOME_SLUGS) {
    const page = await getPublishedPageBySlug(slug);
    if (page) return page;
  }
  return null;
}

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getHomePage(), getSiteSettings()]);
  const seo = resolveSeo({
    pageTitle: page?.snapshot.title ?? settings.siteTitle,
    seoTitle: page?.seoTitle,
    seoDescription: page?.seoDescription,
    siteTitle: settings.siteTitle,
    defaultDescription: settings.defaultMetaDescription,
    isHome: true,
  });
  // The home page's title is the site name itself: do not let the layout template repeat it.
  const title = { absolute: seo.title };
  const description = seo.description;
  const ogImage = page?.snapshot.background?.bannerImageUrl ?? page?.snapshot.background?.imageUrl ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, images: ogImage ? [ogImage] : undefined },
  };
}

export default async function HomePage() {
  const page = await getHomePage();
  if (!page) notFound();
  const blocks = await resolveDynamicBlocks(page.snapshot.blocks);
  return <PageRenderer page={{ ...page.snapshot, blocks }} />;
}
