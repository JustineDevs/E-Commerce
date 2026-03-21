import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartSection } from "@/components/AddToCartSection";
import { StorefrontCommerceAlert } from "@/components/StorefrontCommerceAlert";
import { fetchProductBySlug } from "@/lib/catalog-fetch";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await fetchProductBySlug(slug, 60);

  if (res.kind === "misconfigured" || res.kind === "service_error") {
    return (
      <main className="storefront-page-shell max-w-[1600px]">
        <div className="mx-auto max-w-2xl pt-8">
          <StorefrontCommerceAlert failure={res} />
        </div>
      </main>
    );
  }

  if (res.kind === "not_found") {
    notFound();
  }

  const { product } = res;

  const images = product.images;
  const mainImage = images[0];
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const sizeRun = [...new Set(product.variants.map((v) => v.size))]
    .filter(Boolean)
    .sort();

  return (
    <main className="storefront-page-shell max-w-[1600px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
        <div className="lg:col-span-7 flex flex-col md:flex-row-reverse gap-6">
          <div className="flex-1 overflow-hidden bg-surface-container-low">
            {mainImage ? (
              <img
                src={mainImage.imageUrl}
                alt={product.name}
                className="w-full h-[500px] md:h-[716px] object-cover transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="w-full h-[500px] md:h-[716px] bg-surface-container-high" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:w-24">
              {images.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="flex-shrink-0 w-20 h-24 bg-surface-container-highest cursor-pointer hover:opacity-80 transition-opacity overflow-hidden rounded"
                >
                  <img
                    src={img.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
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
              <details className="group py-5 border-b border-outline-variant/20">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Material & Care
                  </span>
                  <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <div className="pt-4 text-sm leading-relaxed text-on-surface-variant font-body">
                  Fabric notes appear in the description when provided. Unless
                  the sewn-in label states otherwise, machine cold wash with
                  like colors and dry flat in shade to preserve shape and print.
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
    </main>
  );
}
