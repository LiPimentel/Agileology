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
  return {
    title: page.seoTitle ?? settings.siteTitle,
    description: page.seoDescription ?? settings.defaultMetaDescription ?? undefined,
  };
}

export default async function GenericPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) notFound();
  return <PageRenderer page={page.snapshot} />;
}
