import Link from "next/link";
import type { Product } from "@apparel-commerce/types";

export const dynamic = "force-dynamic";

async function fetchFeaturedProducts(): Promise<Product[]> {
  const base = process.env.API_URL ?? "http://localhost:4000";
  const res = await fetch(`${base}/products?limit=4`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? [];
}

export default async function HomePage() {
  const products = await fetchFeaturedProducts();

  return (
    <>
      <section className="relative h-[600px] md:h-[721px] w-full overflow-hidden bg-surface-container-low flex items-center px-8 md:px-24">
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-none text-primary mb-8">
            ARCHITECTURAL
            <br />
            SILENCE
          </h1>
          <p className="font-body text-lg text-on-surface-variant max-w-md mb-12">
            A study in monochrome precision. High-performance apparel designed for the modern structuralist.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-on-primary font-medium rounded bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-all"
          >
            Shop Now
          </Link>
        </div>
        <div className="absolute right-0 top-0 w-full md:w-1/2 h-full opacity-40 md:opacity-100">
          <div className="w-full h-full bg-surface-container-high" />
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
          <Link
            href="/shop?category=Shorts"
            className="md:col-span-8 group relative overflow-hidden bg-surface-container-low rounded-lg"
          >
            <div className="w-full h-full bg-surface-container-high group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute bottom-10 left-10">
              <h3 className="font-headline text-4xl font-extrabold text-white mix-blend-difference">
                Shorts
              </h3>
              <span className="text-white mix-blend-difference font-medium underline underline-offset-8 mt-2 inline-block">
                Explore Collection
              </span>
            </div>
          </Link>
          <Link
            href="/shop"
            className="md:col-span-4 group relative overflow-hidden bg-surface-container-high rounded-lg"
          >
            <div className="w-full h-full bg-surface-container-low group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute bottom-10 left-10">
              <h3 className="font-headline text-2xl font-extrabold text-primary">Essentials</h3>
              <span className="text-primary font-medium hover:underline underline-offset-8 mt-2 inline-block transition-all">
                Shop Basics
              </span>
            </div>
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[400px]">
          <Link
            href="/shop"
            className="md:col-span-12 group relative overflow-hidden bg-surface-container-highest rounded-lg"
          >
            <div className="w-full h-full bg-surface-container-high group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <h3 className="font-headline text-5xl font-extrabold text-primary drop-shadow-sm">
                Outerwear
              </h3>
              <p className="text-on-surface-variant mt-4 font-medium tracking-widest uppercase text-sm">
                Engineered for Silence
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-surface-container-low">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-16 gap-4">
          <h2 className="font-headline text-4xl font-extrabold tracking-tighter">
            THE LATEST DROP
          </h2>
          <div className="h-[2px] bg-outline-variant flex-grow mx-8 hidden md:block opacity-20" />
          <Link
            href="/shop"
            className="text-primary font-medium hover:underline transition-all"
          >
            View All Products
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <p>No products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {products.map((product) => {
              const image = product.images[0];
              const minPrice = Math.min(...product.variants.map((v) => v.price));
              const firstVariant = product.variants[0];
              return (
                <Link href={`/shop/${product.slug}`} key={product.id} className="group">
                  <div className="aspect-[3/4] overflow-hidden bg-surface-container-lowest rounded mb-6">
                    {image ? (
                      <img
                        src={image.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-container-high" />
                    )}
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-headline text-lg font-bold text-primary">
                        {product.name}
                      </p>
                      <p className="text-on-surface-variant text-sm mt-1">
                        {firstVariant?.color ?? product.variants[0]?.color ?? ""}
                      </p>
                    </div>
                    <p className="font-headline font-bold text-primary">
                      PHP {minPrice.toLocaleString("en-PH")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="py-32 bg-surface flex justify-center text-center px-8">
        <div className="max-w-xl">
          <h2 className="font-headline text-3xl font-extrabold mb-6">JOIN THE SILENCE</h2>
          <p className="text-on-surface-variant mb-10">
            Access early releases and architectural insights. No noise, just essentials.
          </p>
          <form className="flex flex-col md:flex-row gap-4">
            <input
              type="email"
              placeholder="email@address.com"
              className="flex-grow bg-surface-container-highest border-none rounded px-6 py-4 focus:ring-1 focus:ring-secondary/40 font-body outline-none"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary px-8 py-4 rounded font-medium hover:opacity-90 transition-all"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
