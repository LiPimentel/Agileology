import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug } from "@/lib/posts";
import { getSiteSettings } from "@/lib/settings";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SocialShare } from "@/components/public/SocialShare";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};
  return { title: post.seoTitle ?? post.snapshot.title, description: post.seoDescription ?? undefined };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPublishedPostBySlug(slug), getSiteSettings()]);
  if (!post) notFound();

  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/blog/${slug}`;

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">{post.snapshot.title}</h1>
        {post.publishedAt && (
          <p className="mt-2 text-sm text-slate-500">{new Date(post.publishedAt).toLocaleDateString("es")}</p>
        )}
        {post.snapshot.tags.length > 0 && (
          <div className="mt-2 flex gap-2">
            {post.snapshot.tags.map((t) => (
              <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {post.snapshot.featuredImage && (
        <Image
          src={post.snapshot.featuredImage}
          alt=""
          width={900}
          height={500}
          className="w-full rounded-lg object-cover"
        />
      )}

      {post.snapshot.blocks.map((block, i) => (
        <BlockRenderer key={block.id ?? i} block={block} />
      ))}

      <SocialShare url={url} title={post.snapshot.title} />
      <p className="text-sm text-slate-400">{settings.siteTitle}</p>
    </article>
  );
}
