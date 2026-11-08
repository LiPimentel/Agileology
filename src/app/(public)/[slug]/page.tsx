import type { Metadata } from "next";
import { isHomeSlug } from "@/lib/home";
import { fullTitle, resolveSeo } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getPublishedPageBySlug } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { resolveDynamicBlocks } from "@/lib/dynamicBlocks";
import { PageRenderer } from "@/components/public/PageRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [page, settings] = await Promise.all([getPublishedPageBySlug(slug), getSiteSettings()]);
  if (!page) return {};
  const home = isHomeSlug(slug);
  const seo = resolveSeo({
    pageTitle: page.snapshot.title,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    siteTitle: settings.siteTitle,
    defaultDescription: settings.defaultMetaDescription,
    isHome: home,
  });
  // The layout template adds " — site name"; skip it when the title already has it (or is the home page).
  const full = fullTitle(seo.title, settings.siteTitle, home);
  const title = full.absolute ? { absolute: seo.title } : seo.title;
  const description = seo.description;
  const ogImage = page.snapshot.background?.bannerImageUrl ?? page.snapshot.background?.imageUrl ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: isHomeSlug(slug) ? "/" : `/${slug}` },
    openGraph: { title, description, images: ogImage ? [ogImage] : undefined },
  };
}

export default async function GenericPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) notFound();
  const blocks = await resolveDynamicBlocks(page.snapshot.blocks);
  return <PageRenderer page={{ ...page.snapshot, blocks }} />;
}
