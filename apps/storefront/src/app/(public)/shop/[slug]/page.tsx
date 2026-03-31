import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AddToCartSection } from "@/components/AddToCartSection";
import { CatalogProductCard } from "@/components/CatalogProductCard";
import { ProductDetailsAccordions } from "@/components/ProductDetailsAccordions";
import { ProductGalleryCarousel } from "@/components/ProductGalleryCarousel";
import { ProductRatingNearTitle } from "@/components/ProductRatingNearTitle";
import { ProductQaSection } from "@/components/ProductQaSection";
import { ProductReviewsSection } from "@/components/ProductReviewsSection";
import { ShippingDeliveryEstimate } from "@/components/ShippingDeliveryEstimate";
import { TrustBadgesStrip } from "@/components/TrustBadgesStrip";
import { ProductViewTracker } from "@/components/ProductViewTracker";
import { StorefrontCommerceAlert } from "@/components/StorefrontCommerceAlert";
import { fetchRelatedProducts } from "@/lib/catalog-fetch";
import { getCachedProductBySlug } from "@/lib/cached-product";
import { fetchProductQaEntries } from "@/lib/product-qa";
import {
  fetchProductReviews,
  summarizeProductReviews,
} from "@/lib/product-reviews";
import {
  buildJsonLdProduct,
  buildJsonLdBreadcrumb,
  canonicalUrl,
  SITE_NAME,
} from "@/lib/seo";

/** ISR-style caching; live stock is enforced at Medusa checkout. */
export const revalidate = 120;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await getCachedProductBySlug(slug);
  if (res.kind !== "ok") {
    return { title: "Product" };
  }
  const { product } = res;
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const image = product.images[0]?.imageUrl;
  const desc =
    product.seoDescription?.trim() ||
    product.description?.slice(0, 155) ||
    `${product.name} — PHP ${minPrice.toLocaleString("en-PH")}. ${product.category ?? "Apparel"}. ${SITE_NAME}.`;

  return {
    title: product.name,
    description: desc,
    alternates: { canonical: canonicalUrl(`/shop/${slug}`) },
    openGraph: {
      title: product.name,
      description: desc,
      url: canonicalUrl(`/shop/${slug}`),
      siteName: SITE_NAME,
      type: "website",
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: desc,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const res = await getCachedProductBySlug(slug);

  if (res.kind === "misconfigured" || res.kind === "service_error") {
    return (
      <main className="storefront-page-shell storefront-pdp-shell w-full">
        <div className="mx-auto max-w-2xl pt-8">
          <StorefrontCommerceAlert failure={res} />
        </div>
      </main>
    );
  }

  if (res.kind !== "ok") {
    notFound();
  }

  const { product } = res;

  const [relatedRes, reviews, qaEntries] = await Promise.all([
    fetchRelatedProducts(product, 4),
    fetchProductReviews(slug, { medusaProductId: product.id }),
    fetchProductQaEntries(slug, { medusaProductId: product.id }),
  ]);
  const reviewSummary = summarizeProductReviews(reviews);
  const relatedProducts =
    relatedRes.kind === "ok" ? relatedRes.products : [];

  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const sizeRun = [...new Set(product.variants.map((v) => v.size))]
    .filter(Boolean)
    .sort();

  const productJsonLd = buildJsonLdProduct(product);
  const breadcrumbJsonLd = buildJsonLdBreadcrumb([
    { name: "Home", href: "/" },
    { name: "Shop", href: "/shop" },
    { name: product.name, href: `/shop/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <main className="storefront-page-shell storefront-pdp-shell w-full">
        <ProductViewTracker slug={slug} id={product.id} />
        <div className="grid w-full grid-cols-1 items-start gap-10 lg:gap-14 xl:grid-cols-2 xl:gap-16 2xl:gap-20">
          <div className="min-w-0 space-y-8 xl:max-w-none">
            <ProductGalleryCarousel
              slides={product.gallerySlides}
              productName={product.name}
            />
            <div className="hidden border-t border-outline-variant/20 pt-8 xl:block">
              <ProductDetailsAccordions
                product={product}
                sizeRun={sizeRun}
              />
            </div>
          </div>

        <div className="min-w-0 flex flex-col justify-start">
          <div className="space-y-2 mb-8">
            {product.category && (
              <span className="text-xs font-label uppercase tracking-widest text-secondary">
                {product.category}
              </span>
            )}
            {product.brand ? (
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                {product.brand}
              </p>
            ) : null}
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tighter text-primary">
              {product.name}
            </h1>
            <ProductRatingNearTitle
              average={reviewSummary.average}
              count={reviewSummary.count}
            />
            <p className="text-xl font-body text-on-surface-variant">
              PHP {minPrice.toLocaleString("en-PH")}
            </p>
          </div>

          <div className="space-y-10">
            <AddToCartSection product={product} />
            <ShippingDeliveryEstimate />
            <TrustBadgesStrip />

            <div className="border-t border-outline-variant/20 pt-8 xl:hidden">
              <ProductDetailsAccordions
                product={product}
                sizeRun={sizeRun}
              />
            </div>
          </div>
        </div>
      </div>

      {product.lifestyleImageUrl?.trim() ? (
        <section
          className="mt-16 border-t border-outline-variant/20 pt-16"
          aria-labelledby="lifestyle-heading"
        >
          <h2
            id="lifestyle-heading"
            className="mb-6 font-headline text-lg font-bold uppercase tracking-wider text-primary"
          >
            Shop the look
          </h2>
          <div className="relative aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-lg bg-surface-container-low">
            <Image
              src={product.lifestyleImageUrl!.trim()}
              alt={`${product.name} lifestyle`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
            {product.hotspots.map((h, i) => (
              <Link
                key={`${h.productSlug}-${i}`}
                href={`/shop/${h.productSlug}`}
                className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-on-primary bg-primary text-[10px] font-bold uppercase text-on-primary shadow-md hover:bg-on-primary hover:text-primary"
                style={{ left: `${h.xPct}%`, top: `${h.yPct}%` }}
                title={h.label ?? "View product"}
              >
                +
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedProducts.length > 0 ? (
        <section
          className="mt-16 border-t border-outline-variant/20 pt-16"
          aria-labelledby="related-heading"
        >
          <h2
            id="related-heading"
            className="mb-8 font-headline text-xl font-bold uppercase tracking-wider text-primary"
          >
            You may also like
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <CatalogProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      <ProductQaSection entries={qaEntries} />

      <ProductReviewsSection
        productSlug={slug}
        medusaProductId={product.id}
        reviews={reviews}
      />
      </main>
    </>
  );
}
