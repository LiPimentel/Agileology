import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPageBySlug } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { PageRenderer } from "@/components/public/PageRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [page, settings] = await Promise.all([getPublishedPageBySlug(slug), getSiteSettings()]);
  if (!page) return {};
  const title = page.seoTitle ?? settings.siteTitle;
  const description = page.seoDescription ?? settings.defaultMetaDescription ?? undefined;
  const ogImage = page.snapshot.background?.bannerImageUrl ?? page.snapshot.background?.imageUrl ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: slug === "home" ? "/" : `/${slug}` },
    openGraph: { title, description, images: ogImage ? [ogImage] : undefined },
  };
}

export default async function GenericPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) notFound();
  return <PageRenderer page={page.snapshot} />;
}
