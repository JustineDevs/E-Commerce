import Link from "next/link";
import type { Product } from "@apparel-commerce/types";

export const dynamic = "force-dynamic";

async function fetchProduct(slug: string): Promise<Product | null> {
  const base = process.env.API_URL ?? "http://localhost:4000";
  const res = await fetch(`${base}/products/${slug}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center">
          <h1 className="text-xl font-semibold text-primary">Product not found</h1>
          <Link href="/shop" className="mt-4 inline-block text-on-surface-variant hover:text-primary">
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  const images = product.images;
  const mainImage = images[0];
  const sizes = [...new Set(product.variants.map((v) => v.size))].sort();
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const minPrice = Math.min(...product.variants.map((v) => v.price));

  return (
    <main className="pt-32 pb-24 px-6 md:px-12 lg:px-24 max-w-[1600px] mx-auto">
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
            <div className="space-y-4">
              <p className="text-xs font-label font-bold uppercase tracking-wider">
                Color — <span className="text-secondary font-normal">{colors[0] ?? ""}</span>
              </p>
              <div className="flex gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="w-10 h-10 rounded-full bg-surface-container-high ring-1 ring-outline-variant hover:ring-2 hover:ring-primary transition-all"
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-xs font-label font-bold uppercase tracking-wider">Size</p>
                <button className="text-xs font-label text-secondary underline hover:text-primary transition-colors">
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    className="py-3 text-sm font-medium bg-surface-container-low hover:bg-surface-container-high transition-colors"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Link
                href={`/checkout?product=${product.id}`}
                className="block w-full py-5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold tracking-tight rounded text-center hover:opacity-90 active:scale-95 transition-all duration-200"
              >
                Add to Bag
              </Link>
            </div>

            <div className="space-y-0 pt-8 border-t border-outline-variant/20">
              {product.description && (
                <details className="group py-5 border-b border-outline-variant/20" open>
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
              )}
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
                  100% Cotton. Cold wash only. Dry flat in shade.
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
                <div className="pt-4 text-sm leading-relaxed text-on-surface-variant font-body">
                  Complimentary standard shipping on all orders. Returns accepted within 14 days of delivery in original packaging.
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
