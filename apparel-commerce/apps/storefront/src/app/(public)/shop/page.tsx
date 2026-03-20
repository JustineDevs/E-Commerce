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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Shop</h1>
        <p className="mt-1 text-slate-600">Browse our product catalog.</p>

        {products.length === 0 ? (
          <div className="mt-12 rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">No products yet.</p>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const image = product.images[0];
              const minPrice = Math.min(...product.variants.map((v) => v.price));
              return (
                <li key={product.id}>
                  <Link
                    href={`/shop/${product.slug}`}
                    className="group block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="aspect-square bg-slate-100">
                      {image ? (
                        <img
                          src={image.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">No image</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="font-medium text-slate-900 group-hover:text-slate-700">{product.name}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        PHP {minPrice.toLocaleString("en-PH")}
                        {product.variants.length > 1 && " and up"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {total > 20 && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Showing 20 of {total} products
          </p>
        )}
      </div>
    </main>
  );
}
