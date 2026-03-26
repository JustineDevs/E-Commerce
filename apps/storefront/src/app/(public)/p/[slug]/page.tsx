import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCmsPagePublic } from "@apparel-commerce/platform-data";
import { CmsBlocksRenderer } from "@/components/CmsBlocksRenderer";
import { canonicalUrl } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadCmsPagePublic(slug, "en");
  if (!page) {
    return { title: "Page" };
  }
  const title = page.meta_title?.trim() || page.title || slug;
  const description = page.meta_description?.trim() || undefined;
  const canonical = page.canonical_url?.trim() || canonicalUrl(`/p/${slug}`);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: page.og_image_url
      ? {
          images: [{ url: page.og_image_url, alt: title }],
        }
      : undefined,
  };
}

export default async function CmsDynamicPage({ params }: Props) {
  const { slug } = await params;
  const page = await loadCmsPagePublic(slug, "en");
  if (!page) notFound();

  const jsonLd = page.json_ld;
  return (
    <main className="storefront-page-shell max-w-3xl">
      {jsonLd != null ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <h1 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
        {page.title}
      </h1>
      {page.body.trim() ? (
        <div
          className="mt-8 space-y-6 font-body text-sm leading-relaxed text-on-surface-variant"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      ) : null}
      <CmsBlocksRenderer blocks={page.blocks} />
    </main>
  );
}
