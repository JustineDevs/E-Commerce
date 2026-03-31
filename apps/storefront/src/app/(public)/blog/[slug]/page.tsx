import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { loadCmsBlogPostPublic } from "@apparel-commerce/platform-data";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";
import { canonicalUrl } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadCmsBlogPostPublic(slug, "en");
  if (!post) return { title: "Post" };
  const title = post.meta_title?.trim() || post.title;
  return {
    title,
    description: post.meta_description?.trim() || post.excerpt || undefined,
    alternates: { canonical: canonicalUrl(`/blog/${slug}`) },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await loadCmsBlogPostPublic(slug, "en");
  if (!post) notFound();

  const base =
    (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PUBLIC_SITE_ORIGIN).replace(/\/$/, "");
  const pageUrl = `${base}/blog/${encodeURIComponent(slug)}`;
  const jsonLd =
    post.json_ld ??
    ({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.meta_description?.trim() || post.excerpt || undefined,
      datePublished: post.published_at ?? post.created_at,
      dateModified: post.updated_at,
      author: post.author_name
        ? { "@type": "Person", name: post.author_name }
        : undefined,
      image: post.cover_image_url ?? undefined,
      mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
      url: pageUrl,
    } as Record<string, unknown>);

  return (
    <article className="storefront-page-shell max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header>
        <h1 className="font-headline text-3xl font-bold text-primary sm:text-4xl">{post.title}</h1>
        {post.author_name ? (
          <p className="mt-2 text-sm text-on-surface-variant">By {post.author_name}</p>
        ) : null}
      </header>
      {post.cover_image_url ? (
        <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-xl bg-surface-container-low">
          <Image
            src={post.cover_image_url}
            alt={post.title ? `${post.title} cover` : "Blog cover"}
            fill
            sizes="(max-width: 768px) 100vw, 48rem"
            className="object-cover"
            priority
          />
        </div>
      ) : null}
      <div
        className="mt-10 space-y-6 font-body text-sm leading-relaxed text-on-surface-variant"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />
    </article>
  );
}
