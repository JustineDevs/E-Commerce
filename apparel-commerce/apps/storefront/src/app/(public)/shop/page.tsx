import Link from "next/link";
import { CatalogProductCard } from "@apparel-commerce/ui";
import {
  fetchProductsPage,
  fetchCategorySummaries,
  fetchVariantFacets,
} from "@/lib/catalog-fetch";
import { firstCommerceFailure } from "@/lib/catalog-fetch-helpers";
import { shopHref } from "@/lib/shop-url";
import { ShopSortSelect } from "@/components/ShopSortSelect";
import { StorefrontCommerceAlert } from "@/components/StorefrontCommerceAlert";

export const dynamic = "force-dynamic";

const SORTS = ["newest", "name_asc", "price_asc", "price_desc"] as const;
type Sort = (typeof SORTS)[number];

function parseSort(value: string | undefined): Sort {
  if (value && (SORTS as readonly string[]).includes(value))
    return value as Sort;
  return "newest";
}

function parseOffset(value: string | undefined): number {
  const n = parseInt(value ?? "0", 10);
  if (!Number.isFinite(n) || n < 0 || n > 50_000) return 0;
  return n;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    size?: string;
    color?: string;
    sort?: string;
    offset?: string;
    q?: string;
  }>;
}) {
  const sp = await searchParams;
  const category = sp.category?.trim() || undefined;
  const size = sp.size?.trim() || undefined;
  const color = sp.color?.trim() || undefined;
  const searchQ = sp.q?.trim() || undefined;
  const sort = parseSort(sp.sort);
  const offset = parseOffset(sp.offset);
  const limit = 20;

  const [pageRes, catRes, facetRes] = await Promise.all([
    fetchProductsPage(limit, {
      category,
      size,
      color,
      q: searchQ,
      sort,
      offset,
      revalidate: 60,
    }),
    fetchCategorySummaries(120),
    fetchVariantFacets(category, 120),
  ]);

  const failure = firstCommerceFailure(pageRes, catRes, facetRes);
  if (failure) {
    return (
      <main className="storefront-page-shell max-w-[1600px] pb-12 sm:pb-16 md:pb-24">
        <div className="mx-auto max-w-2xl pt-8">
          <StorefrontCommerceAlert failure={failure} />
        </div>
      </main>
    );
  }

  const { products, total } = pageRes;
  const categories = catRes.summaries;
  const facets = facetRes.facets;

  const totalActive = categories.reduce((s, c) => s + c.count, 0);
  const hasMore = offset + products.length < total;

  return (
    <main className="storefront-page-shell max-w-[1600px] pb-12 sm:pb-16 md:pb-24">
      <header className="mb-12 grid grid-cols-1 items-end gap-8 sm:mb-16 lg:mb-20 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <h1 className="font-headline text-[clamp(2rem,6.5vw,4.5rem)] font-bold leading-[1.05] tracking-tighter text-primary">
            Maharlika
            <br />
            <span className="text-[clamp(1.2rem,4vw,2.75rem)] font-bold">
              Apparel Custom
            </span>
          </h1>
          {searchQ ? (
            <p className="mt-4 font-body text-base text-on-surface-variant">
              Search results for{" "}
              <strong className="text-primary">{searchQ}</strong>
            </p>
          ) : null}
          <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-on-surface-variant md:text-lg">
            Structural silhouettes and quiet luxury-shorts, shirts, and layers
            built for everyday precision. Every piece reflects Maharlika Apparel
            Custom craft.
          </p>
        </div>
        <div className="flex justify-start lg:col-span-4 lg:justify-end">
          <ShopSortSelect
            value={sort}
            category={category}
            size={size}
            color={color}
            search={searchQ}
          />
        </div>
      </header>

      <div className="flex min-w-0 flex-col gap-10 lg:flex-row lg:gap-12">
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-12">
          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-[0.2em] mb-6 text-primary">
              Category
            </h3>
            <ul className="space-y-4">
              <li>
                <Link
                  href={shopHref({ size, color, sort, search: searchQ })}
                  className={`flex items-center justify-between text-sm transition-colors ${
                    !category
                      ? "font-medium text-primary"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span>All</span>
                  <span className="text-[10px] text-on-surface-variant">
                    ({totalActive})
                  </span>
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.category}>
                  <Link
                    href={shopHref({
                      category: c.category,
                      size: undefined,
                      color: undefined,
                      sort,
                      search: searchQ,
                    })}
                    className={`flex items-center justify-between text-sm transition-colors ${
                      category === c.category
                        ? "font-medium text-primary"
                        : "text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    <span>{c.category}</span>
                    <span className="text-[10px]">({c.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-[0.2em] mb-6 text-primary">
              Size
            </h3>
            {facets.sizes.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                No sizes in this view.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {facets.sizes.map((s) => {
                  const active = size === s;
                  return (
                    <Link
                      key={s}
                      href={shopHref({
                        category,
                        size: active ? undefined : s,
                        color,
                        sort,
                        search: searchQ,
                      })}
                      className={`aspect-square flex items-center justify-center text-[10px] font-bold transition-all rounded ${
                        active
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low hover:bg-primary hover:text-on-primary"
                      }`}
                    >
                      {s}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-[0.2em] mb-6 text-primary">
              Color
            </h3>
            {facets.colors.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                No colors in this view.
              </p>
            ) : (
              <div className="space-y-3">
                {facets.colors.map((col) => {
                  const active = color === col;
                  return (
                    <Link
                      key={col}
                      href={shopHref({
                        category,
                        size,
                        color: active ? undefined : col,
                        sort,
                        search: searchQ,
                      })}
                      className={`flex items-center gap-3 w-full group rounded px-1 py-0.5 -mx-1 ${
                        active ? "ring-1 ring-primary" : ""
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-surface-container-highest border border-outline-variant shrink-0" />
                      <span className="text-xs font-medium text-on-surface-variant group-hover:text-primary transition-colors uppercase tracking-wider">
                        {col}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {(category || size || color || searchQ) && (
            <Link
              href="/shop"
              className="inline-block text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
            >
              Clear filters
            </Link>
          )}
        </aside>

        <div className="flex-grow">
          {products.length === 0 ? (
            <div className="rounded-lg border border-surface-container-high bg-surface-container-lowest p-12 text-center">
              <p className="text-on-surface-variant">
                No products match these filters.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-block text-primary text-sm font-medium underline"
              >
                View all products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-16 xl:grid-cols-3">
              {products.map((product) => (
                <CatalogProductCard
                  key={product.id}
                  product={product}
                  intervalMs={3000}
                />
              ))}
            </div>
          )}

          {total > 0 && (
            <div className="mt-16 flex flex-col items-center gap-6">
              <p className="font-body text-xs text-on-surface-variant uppercase tracking-widest">
                Showing {offset + 1}–{Math.min(offset + products.length, total)}{" "}
                of {total}
              </p>
              {hasMore && (
                <Link
                  href={shopHref({
                    category,
                    size,
                    color,
                    sort,
                    search: searchQ,
                    offset: offset + limit,
                  })}
                  className="px-12 py-4 border border-primary text-primary text-xs font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-on-primary transition-all"
                >
                  Load more
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
