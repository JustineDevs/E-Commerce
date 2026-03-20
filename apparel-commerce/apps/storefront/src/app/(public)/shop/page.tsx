import Link from "next/link";
import type { Product } from "@apparel-commerce/types";

export const dynamic = "force-dynamic";

async function fetchProducts(): Promise<{ products: Product[]; total: number }> {
  const base = process.env.API_URL ?? "http://localhost:4000";
  const res = await fetch(`${base}/products?limit=20`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export default async function ShopPage() {
  const { products, total } = await fetchProducts();

  return (
    <main className="pt-32 pb-24 px-8 max-w-[1600px] mx-auto">
      <header className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-8">
          <h1 className="font-headline text-6xl md:text-8xl font-bold tracking-tighter text-primary mb-6">
            Essential
            <br />
            Architectures
          </h1>
          <p className="font-body text-lg text-on-surface-variant max-w-xl leading-relaxed">
            A collection defined by structural integrity and quiet luxury. Each piece is an exercise in restraint.
          </p>
        </div>
        <div className="lg:col-span-4 flex justify-start lg:justify-end">
          <div className="flex gap-4 items-center">
            <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
              Filter by
            </span>
            <button className="bg-surface-container-high px-4 py-2 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              Sort: Newest First
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-12">
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-12">
          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-[0.2em] mb-6 text-primary">
              Category
            </h3>
            <ul className="space-y-4">
              <li className="flex items-center justify-between text-sm font-medium text-primary">
                <span>All Items</span>
                <span className="text-[10px] text-on-surface-variant">({total})</span>
              </li>
              <li className="flex items-center justify-between text-sm text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
                <span>Shorts</span>
                <span className="text-[10px]">(12)</span>
              </li>
              <li className="flex items-center justify-between text-sm text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
                <span>Tops</span>
                <span className="text-[10px]">(18)</span>
              </li>
              <li className="flex items-center justify-between text-sm text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
                <span>Bottoms</span>
                <span className="text-[10px]">(12)</span>
              </li>
            </ul>
          </section>
          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-[0.2em] mb-6 text-primary">
              Size
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {["S", "M", "L", "XL"].map((size) => (
                <button
                  key={size}
                  className="aspect-square bg-surface-container-low text-[10px] font-bold hover:bg-primary hover:text-on-primary transition-all"
                >
                  {size}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-[0.2em] mb-6 text-primary">
              Color
            </h3>
            <div className="space-y-3">
              {["Black", "White", "Navy", "Olive"].map((color) => (
                <button
                  key={color}
                  className="flex items-center gap-3 w-full group"
                >
                  <span
                    className={`w-4 h-4 rounded-full ${
                      color === "Black"
                        ? "bg-black outline outline-1 outline-offset-2 outline-primary"
                        : color === "White"
                        ? "bg-white border border-outline-variant"
                        : color === "Navy"
                        ? "bg-[#232D3F]"
                        : "bg-[#4B5320]"
                    }`}
                  />
                  <span className="text-xs font-medium text-on-surface-variant group-hover:text-primary transition-colors uppercase tracking-wider">
                    {color}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <div className="flex-grow">
          {products.length === 0 ? (
            <div className="rounded-lg border border-surface-container-high bg-surface-container-lowest p-12 text-center">
              <p className="text-on-surface-variant">No products yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-16">
              {products.map((product) => {
                const image = product.images[0];
                const minPrice = Math.min(...product.variants.map((v) => v.price));
                const firstVariant = product.variants[0];
                return (
                  <Link key={product.id} href={`/shop/${product.slug}`} className="group cursor-pointer">
                    <div className="relative overflow-hidden bg-surface-container-low aspect-[3/4] mb-6">
                      {image ? (
                        <img
                          src={image.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-container-high" />
                      )}
                      <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="block w-full bg-primary text-on-primary py-3 text-xs font-bold uppercase tracking-widest text-center">
                          Quick Add
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-headline text-lg font-bold text-primary mb-1">
                          {product.name.toUpperCase()}
                        </h3>
                        <p className="font-body text-xs text-on-surface-variant uppercase tracking-widest">
                          {firstVariant?.color ?? product.variants[0]?.color ?? ""}
                        </p>
                      </div>
                      <span className="font-headline text-lg font-medium text-primary">
                        PHP {minPrice.toLocaleString("en-PH")}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {total > 20 && (
            <div className="mt-32 flex flex-col items-center gap-6">
              <p className="font-body text-xs text-on-surface-variant uppercase tracking-widest">
                Showing 20 of {total} items
              </p>
              <div className="w-full max-w-xs h-[1px] bg-surface-container-high relative">
                <div className="absolute left-0 top-0 h-full bg-primary w-[14%]" />
              </div>
              <button className="mt-4 px-12 py-4 border border-primary text-primary text-xs font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-on-primary transition-all">
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
