import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AddToCartSection } from "@/components/AddToCartSection";
import { CatalogProductCard } from "@/components/CatalogProductCard";
import { ProductImageZoom } from "@/components/ProductImageZoom";
import { ProductReviewsSection } from "@/components/ProductReviewsSection";
import { ProductViewTracker } from "@/components/ProductViewTracker";
import { StorefrontCommerceAlert } from "@/components/StorefrontCommerceAlert";
import { fetchRelatedProducts } from "@/lib/catalog-fetch";
import { getCachedProductBySlug } from "@/lib/cached-product";
import { fetchProductReviews } from "@/lib/product-reviews";
import {
  buildJsonLdProduct,
  buildJsonLdBreadcrumb,
  canonicalUrl,
} from "@/lib/seo";

/** ISR-style caching; live stock is enforced at Medusa checkout. */
export const revalidate = 120;

type Props = {
  params: Promise<{ slug: string }>;
};

/** Returns a YouTube embed URL, or null if the string is not a recognized YouTube link. */
function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const embed = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embed?.[1]) return `https://www.youtube.com/embed/${embed[1]}`;
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

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
    `${product.name} — PHP ${minPrice.toLocaleString("en-PH")}. ${product.category ?? "Apparel"} from Maharlika Apparel Custom.`;

  return {
    title: product.name,
    description: desc,
    alternates: { canonical: canonicalUrl(`/shop/${slug}`) },
    openGraph: {
      title: product.name,
      description: desc,
      url: canonicalUrl(`/shop/${slug}`),
      siteName: "Maharlika Apparel Custom",
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
      <main className="storefront-page-shell max-w-[1600px]">
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

  const [relatedRes, reviews] = await Promise.all([
    fetchRelatedProducts(product, 4),
    fetchProductReviews(slug, { medusaProductId: product.id }),
  ]);
  const relatedProducts =
    relatedRes.kind === "ok" ? relatedRes.products : [];

  const images = product.images;
  const mainImage = images[0];
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
      <main className="storefront-page-shell max-w-[1600px]">
        <ProductViewTracker slug={slug} id={product.id} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          <div className="lg:col-span-7 flex flex-col md:flex-row-reverse gap-6">
          <div className="relative flex-1 overflow-hidden bg-surface-container-low">
            {mainImage ? (
              <div className="relative h-[500px] w-full md:h-[716px]">
                <ProductImageZoom
                  src={mainImage.imageUrl}
                  alt={product.name}
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  priority
                />
              </div>
            ) : (
              <div className="h-[500px] w-full bg-surface-container-high md:h-[716px]" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:w-24">
              {images.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="relative flex-shrink-0 h-24 w-20 cursor-pointer overflow-hidden rounded bg-surface-container-highest transition-opacity hover:opacity-80"
                >
                  <Image
                    src={img.imageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col justify-start">
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
            <p className="text-xl font-body text-on-surface-variant">
              PHP {minPrice.toLocaleString("en-PH")}
            </p>
          </div>

          <div className="space-y-10">
            <AddToCartSection product={product} />

            <div className="space-y-0 pt-8 border-t border-outline-variant/20">
              <details
                className="group py-5 border-b border-outline-variant/20"
                open
              >
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Size guide
                  </span>
                  <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <div className="pt-4 text-sm leading-relaxed text-on-surface-variant font-body space-y-3">
                  <p>
                    <strong>In-stock sizes:</strong>{" "}
                    {sizeRun.length
                      ? sizeRun.join(" · ")
                      : "See variants above."}
                  </p>
                  <p>
                    Maharlika Apparel Custom publishes detailed measurements
                    with new runs. If your size is between two options, size up
                    for a relaxed fit or down for a closer silhouette. Eligible
                    size exchanges may be requested within{" "}
                    <strong>7 days</strong> of delivery for unworn items-see{" "}
                    <Link href="/returns" className="text-primary underline">
                      Returns &amp; exchanges
                    </Link>
                    .
                  </p>
                </div>
              </details>
              {product.description ? (
                <details
                  className="group py-5 border-b border-outline-variant/20"
                  open
                >
                  <summary className="flex justify-between items-center cursor-pointer list-none">
                    <span className="text-sm font-bold uppercase tracking-wider">
                      Description
                    </span>
                    <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <div className="pt-4 text-sm leading-relaxed text-on-surface-variant font-body">
                    {product.description}
                  </div>
                </details>
              ) : null}
              {product.weightKg != null ||
              product.dimensionsLabel?.trim() ? (
                <details
                  className="group py-5 border-b border-outline-variant/20"
                  open
                >
                  <summary className="flex justify-between items-center cursor-pointer list-none">
                    <span className="text-sm font-bold uppercase tracking-wider">
                      Specifications
                    </span>
                    <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <div className="pt-4 text-sm leading-relaxed text-on-surface-variant font-body space-y-2">
                    {product.weightKg != null ? (
                      <p>
                        <strong>Weight:</strong> {product.weightKg} kg
                      </p>
                    ) : null}
                    {product.dimensionsLabel?.trim() ? (
                      <p>
                        <strong>Dimensions:</strong>{" "}
                        {product.dimensionsLabel.trim()}
                      </p>
                    ) : null}
                  </div>
                </details>
              ) : null}
              <details className="group py-5 border-b border-outline-variant/20">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Material & Care
                  </span>
                  <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <div className="pt-4 text-sm leading-relaxed text-on-surface-variant font-body space-y-3">
                  {product.material?.trim() ? (
                    <p>
                      <strong>Fabric composition:</strong>{" "}
                      {product.material.trim()}
                    </p>
                  ) : (
                    <p>
                      Fabric notes appear in the description when provided.
                    </p>
                  )}
                  <p>
                    Unless the sewn-in label states otherwise, machine cold wash
                    with like colors and dry flat in shade to preserve shape and
                    print.
                  </p>
                </div>
              </details>
              <details className="group py-5">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Shipping & Returns
                  </span>
                  <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <div className="pt-4 text-sm leading-relaxed text-on-surface-variant font-body space-y-3">
                  <p>
                    We ship nationwide via trusted couriers (including J&amp;T).
                    Pickup from Cavite can be arranged for qualifying
                    orders-details on your confirmation.
                  </p>
                  <p>
                    <Link href="/shipping" className="text-primary underline">
                      Shipping
                    </Link>
                    {" · "}
                    <Link href="/returns" className="text-primary underline">
                      Returns &amp; exchanges
                    </Link>
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {product.videoUrl?.trim() ? (
        <section
          className="mt-16 border-t border-outline-variant/20 pt-16"
          aria-labelledby="product-video-heading"
        >
          <h2
            id="product-video-heading"
            className="mb-6 font-headline text-lg font-bold uppercase tracking-wider text-primary"
          >
            Video
          </h2>
          {(() => {
            const raw = product.videoUrl!.trim();
            const yt = youtubeEmbedUrl(raw);
            if (yt) {
              return (
                <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-lg bg-black">
                  <iframe
                    title={`${product.name} video`}
                    src={yt}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              );
            }
            if (isDirectVideoUrl(raw)) {
              return (
                <video
                  controls
                  className="w-full max-w-4xl rounded-lg bg-black"
                  src={raw}
                />
              );
            }
            return (
              <p className="text-sm text-on-surface-variant">
                <a
                  href={raw}
                  className="font-medium text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open video
                </a>
              </p>
            );
          })()}
        </section>
      ) : null}

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

      <ProductReviewsSection
        productSlug={slug}
        medusaProductId={product.id}
        reviews={reviews}
      />
      </main>
    </>
  );
}
