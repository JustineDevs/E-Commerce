import Link from "next/link";
import { CatalogProductCard } from "@apparel-commerce/ui";
import { fetchFeaturedProducts } from "@/lib/catalog-fetch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await fetchFeaturedProducts(4, 60);

  return (
    <>
      <section className="relative h-[600px] md:h-[721px] w-full overflow-hidden bg-surface-container-low flex items-center px-8 md:px-24">
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-none text-primary mb-8">
            MAHARLIKA
            <br />
            GRAND CUSTOM
          </h1>
          <p className="font-body text-lg text-on-surface-variant max-w-md mb-12">
            Shorts, shirts, and jackets—quiet silhouettes and honest fabrics from Maharlika Apparel Custom, tailored for
            everyday wear in the Philippines and beyond.
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
            href="/shop?category=Shirt"
            className="md:col-span-4 group relative overflow-hidden bg-surface-container-high rounded-lg"
          >
            <div className="w-full h-full bg-surface-container-low group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute bottom-10 left-10">
              <h3 className="font-headline text-2xl font-extrabold text-primary">Shirts</h3>
              <span className="text-primary font-medium hover:underline underline-offset-8 mt-2 inline-block transition-all">
                Shop shirts
              </span>
            </div>
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[400px]">
          <Link
            href="/shop?category=Jacket"
            className="md:col-span-12 group relative overflow-hidden bg-surface-container-highest rounded-lg"
          >
            <div className="w-full h-full bg-surface-container-high group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <h3 className="font-headline text-5xl font-extrabold text-primary drop-shadow-sm">
                Jackets
              </h3>
              <p className="text-on-surface-variant mt-4 font-medium tracking-widest uppercase text-sm">
                Layers &amp; outerwear
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
            {products.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section id="join-club" className="py-32 bg-surface flex justify-center text-center px-8 scroll-mt-24">
        <div className="max-w-xl">
          <h2 className="font-headline text-3xl font-extrabold mb-6">STAY WITH MAHARLIKA</h2>
          <p className="text-on-surface-variant mb-10">
            New drops, restocks, and studio notes—straight from Maharlika Apparel Custom.
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
