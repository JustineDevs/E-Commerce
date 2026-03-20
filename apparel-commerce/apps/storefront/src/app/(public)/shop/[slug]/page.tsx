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
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Product not found</h1>
          <Link href="/shop" className="mt-4 inline-block text-slate-600 hover:text-slate-900">
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  const image = product.images[0];
  const sizes = [...new Set(product.variants.map((v) => v.size))].sort();
  const colors = [...new Set(product.variants.map((v) => v.color))];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/shop" className="text-sm text-slate-600 hover:text-slate-900">
          Back to shop
        </Link>

        <div className="mt-8 lg:grid lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white">
            {image ? (
              <img
                src={image.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">No image</div>
            )}
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="text-2xl font-semibold text-slate-900">{product.name}</h1>
            {product.brand && (
              <p className="mt-1 text-sm text-slate-500">{product.brand}</p>
            )}
            <p className="mt-4 text-slate-600">{product.description}</p>

            <div className="mt-6">
              <p className="text-sm font-medium text-slate-700">Size</p>
              <p className="mt-1 text-slate-600">{sizes.join(", ")}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">Color</p>
              <p className="mt-1 text-slate-600">{colors.join(", ")}</p>
            </div>

            <div className="mt-6">
              <p className="text-lg font-semibold text-slate-900">
                PHP {Math.min(...product.variants.map((v) => v.price)).toLocaleString("en-PH")}
              </p>
            </div>

            <div className="mt-8">
              <p className="text-sm text-slate-500">
                Select size and color on the next step to add to cart.
              </p>
              <Link
                href={`/checkout?product=${product.id}`}
                className="mt-4 inline-block rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add to cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
