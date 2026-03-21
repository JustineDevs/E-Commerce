import type { Product } from "@apparel-commerce/types";
import {
  mapMedusaProductToProduct,
  minVariantPrice,
  productMatchesVariantFilters,
} from "./medusa-catalog-mapper";
import { createStorefrontMedusaSdk } from "./medusa-sdk";
import {
  getMedusaPublishableKey,
  getMedusaRegionId,
} from "./storefront-medusa-env";

export type CatalogQuery = {
  limit?: number;
  offset?: number;
  category?: string;
  size?: string;
  color?: string;
  q?: string;
  sort?: "newest" | "name_asc" | "price_asc" | "price_desc";
  revalidate?: number;
};

export type CommerceFetchFailure =
  | { kind: "misconfigured"; detail: string }
  | { kind: "service_error"; message: string };

export type ProductsPageResult =
  | { kind: "ok"; products: Product[]; total: number }
  | CommerceFetchFailure;

export type ProductBySlugResult =
  | { kind: "ok"; product: Product }
  | CommerceFetchFailure
  | { kind: "not_found" };

export type CategorySummariesResult =
  | { kind: "ok"; summaries: { category: string; count: number }[] }
  | CommerceFetchFailure;

export type VariantFacetsResult =
  | { kind: "ok"; facets: { sizes: string[]; colors: string[] } }
  | CommerceFetchFailure;

export type FeaturedProductsResult =
  | { kind: "ok"; products: Product[] }
  | CommerceFetchFailure;

function misconfigured(detail: string): CommerceFetchFailure {
  return { kind: "misconfigured", detail };
}

function serviceError(err: unknown): CommerceFetchFailure {
  const message = err instanceof Error ? err.message : String(err);
  return { kind: "service_error", message };
}

const MEDUSA_LIST_FIELDS =
  "*variants,*variants.calculated_price,*variants.options,*categories,*options,+thumbnail,*images";

function requireMedusaClientConfig():
  | { ok: true }
  | { ok: false; reason: CommerceFetchFailure } {
  const regionId = getMedusaRegionId();
  const key = getMedusaPublishableKey();
  if (!key?.trim()) {
    return {
      ok: false,
      reason: misconfigured(
        "Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY or MEDUSA_PUBLISHABLE_API_KEY.",
      ),
    };
  }
  if (!regionId?.trim()) {
    return {
      ok: false,
      reason: misconfigured(
        "Missing NEXT_PUBLIC_MEDUSA_REGION_ID or MEDUSA_REGION_ID.",
      ),
    };
  }
  return { ok: true };
}

async function resolveMedusaCategoryId(
  sdk: ReturnType<typeof createStorefrontMedusaSdk>,
  categoryName: string | undefined,
): Promise<string | undefined> {
  if (!categoryName?.trim()) return undefined;
  const want = categoryName.trim().toLowerCase();
  const { product_categories } = await sdk.store.category.list({
    limit: 200,
    fields: "id,name,handle",
  });
  const row = (product_categories ?? []).find((c) => {
    const name = (c.name ?? "").trim().toLowerCase();
    const handle = (c.handle ?? "").trim().toLowerCase();
    return name === want || handle === want;
  });
  return row?.id;
}

async function fetchMedusaProductsPage(
  limit: number,
  options: CatalogQuery,
): Promise<ProductsPageResult> {
  const gate = requireMedusaClientConfig();
  if (!gate.ok) {
    return gate.reason;
  }

  try {
    const sdk = createStorefrontMedusaSdk();
    const regionId = getMedusaRegionId()!;
    const categoryId = await resolveMedusaCategoryId(sdk, options.category);
    const offset = options.offset ?? 0;
    const variantFilterActive = Boolean(
      options.size?.trim() || options.color?.trim(),
    );
    const priceSort =
      options.sort === "price_asc" || options.sort === "price_desc";

    if (variantFilterActive || priceSort) {
      const collected: Product[] = [];
      let apiOffset = 0;
      const pageSize = 80;
      const targetEnd = offset + limit;
      const maxScan = 2000;

      while (collected.length < targetEnd && apiOffset < maxScan) {
        const listParams: Record<string, unknown> = {
          region_id: regionId,
          limit: pageSize,
          offset: apiOffset,
          fields: MEDUSA_LIST_FIELDS,
          order:
            options.sort === "name_asc"
              ? "title"
              : options.sort === "newest"
                ? "-created_at"
                : "-created_at",
        };
        if (categoryId) listParams.category_id = categoryId;
        if (options.q?.trim()) listParams.q = options.q.trim();

        const { products: rawList } = await sdk.store.product.list(
          listParams as Parameters<typeof sdk.store.product.list>[0],
        );
        const batch = (rawList ?? []).map((p) =>
          mapMedusaProductToProduct(p as never),
        );
        for (const p of batch) {
          if (productMatchesVariantFilters(p, options.size, options.color)) {
            collected.push(p);
          }
        }
        apiOffset += pageSize;
        if (!rawList?.length || rawList.length < pageSize) {
          break;
        }
      }

      if (priceSort) {
        collected.sort((a, b) => {
          const pa = minVariantPrice(a);
          const pb = minVariantPrice(b);
          return options.sort === "price_asc" ? pa - pb : pb - pa;
        });
      }

      return {
        kind: "ok",
        products: collected.slice(offset, offset + limit),
        total: collected.length,
      };
    }

    const listParams: Record<string, unknown> = {
      region_id: regionId,
      limit,
      offset,
      fields: MEDUSA_LIST_FIELDS,
      order:
        options.sort === "name_asc"
          ? "title"
          : options.sort === "newest"
            ? "-created_at"
            : "-created_at",
    };
    if (categoryId) listParams.category_id = categoryId;
    if (options.q?.trim()) listParams.q = options.q.trim();

    const { products: rawList, count } = await sdk.store.product.list(
      listParams as Parameters<typeof sdk.store.product.list>[0],
    );
    let mapped = (rawList ?? []).map((p) =>
      mapMedusaProductToProduct(p as never),
    );

    if (options.sort === "price_asc" || options.sort === "price_desc") {
      mapped = [...mapped].sort((a, b) => {
        const pa = minVariantPrice(a);
        const pb = minVariantPrice(b);
        return options.sort === "price_asc" ? pa - pb : pb - pa;
      });
    }

    return {
      kind: "ok",
      products: mapped,
      total: typeof count === "number" ? count : mapped.length,
    };
  } catch (e) {
    return serviceError(e);
  }
}

async function fetchMedusaProductBySlug(slug: string): Promise<ProductBySlugResult> {
  const gate = requireMedusaClientConfig();
  if (!gate.ok) {
    return gate.reason;
  }
  try {
    const sdk = createStorefrontMedusaSdk();
    const regionId = getMedusaRegionId()!;
    const { products } = await sdk.store.product.list({
      region_id: regionId,
      handle: slug,
      limit: 1,
      fields: MEDUSA_LIST_FIELDS,
    });
    const raw = products?.[0];
    if (!raw) {
      return { kind: "not_found" };
    }
    return { kind: "ok", product: mapMedusaProductToProduct(raw as never) };
  } catch (e) {
    return serviceError(e);
  }
}

async function fetchMedusaCategorySummaries(): Promise<CategorySummariesResult> {
  const gate = requireMedusaClientConfig();
  if (!gate.ok) {
    return gate.reason;
  }
  try {
    const sdk = createStorefrontMedusaSdk();
    const regionId = getMedusaRegionId()!;
    const { product_categories } = await sdk.store.category.list({
      limit: 200,
      fields: "id,name,handle",
    });
    const rows = product_categories ?? [];
    const summaries = await Promise.all(
      rows.map(async (c) => {
        const { count } = await sdk.store.product.list({
          region_id: regionId,
          category_id: c.id,
          limit: 1,
          fields: "id",
        });
        const label = (c.name ?? c.handle ?? c.id ?? "").trim();
        return {
          category: label,
          count: typeof count === "number" ? count : 0,
        };
      }),
    );
    return {
      kind: "ok",
      summaries: summaries.filter((s) => s.category && s.count > 0),
    };
  } catch (e) {
    return serviceError(e);
  }
}

async function fetchMedusaVariantFacets(
  category: string | undefined,
): Promise<VariantFacetsResult> {
  const gate = requireMedusaClientConfig();
  if (!gate.ok) {
    return gate.reason;
  }
  try {
    const sdk = createStorefrontMedusaSdk();
    const regionId = getMedusaRegionId()!;
    const categoryId = await resolveMedusaCategoryId(sdk, category);
    const { products } = await sdk.store.product.list({
      region_id: regionId,
      ...(categoryId ? { category_id: categoryId } : {}),
      limit: 200,
      fields: MEDUSA_LIST_FIELDS,
    });
    const sizes = new Set<string>();
    const colors = new Set<string>();
    for (const pr of products ?? []) {
      const p = mapMedusaProductToProduct(pr as never);
      for (const v of p.variants) {
        if (v.size) sizes.add(v.size);
        if (v.color) colors.add(v.color);
      }
    }
    return {
      kind: "ok",
      facets: {
        sizes: [...sizes].sort(),
        colors: [...colors].sort((a, b) => a.localeCompare(b)),
      },
    };
  } catch (e) {
    return serviceError(e);
  }
}

export async function fetchProductsPage(
  limit: number,
  options: CatalogQuery = {},
): Promise<ProductsPageResult> {
  return fetchMedusaProductsPage(limit, options);
}

export async function fetchFeaturedProducts(
  limit = 4,
  _revalidate = 60,
): Promise<FeaturedProductsResult> {
  const r = await fetchMedusaProductsPage(limit, { sort: "newest" });
  if (r.kind !== "ok") {
    return r;
  }
  return { kind: "ok", products: r.products };
}

export async function fetchProductBySlug(
  slug: string,
  _revalidate = 60,
): Promise<ProductBySlugResult> {
  return fetchMedusaProductBySlug(slug);
}

export type CategorySummary = { category: string; count: number };

export async function fetchCategorySummaries(
  _revalidate = 120,
): Promise<CategorySummariesResult> {
  return fetchMedusaCategorySummaries();
}

export type VariantFacets = { sizes: string[]; colors: string[] };

export async function fetchVariantFacets(
  category: string | undefined,
  _revalidate = 120,
): Promise<VariantFacetsResult> {
  return fetchMedusaVariantFacets(category);
}

/** Lightweight list of product slugs for sitemap/SEO. Returns [] when misconfigured. */
export async function fetchProductSlugsForSitemap(
  maxItems = 1000,
): Promise<string[]> {
  const gate = requireMedusaClientConfig();
  if (!gate.ok) return [];

  try {
    const sdk = createStorefrontMedusaSdk();
    const regionId = getMedusaRegionId()!;
    const slugs: string[] = [];
    let offset = 0;
    const pageSize = 100;

    while (slugs.length < maxItems) {
      const { products } = await sdk.store.product.list({
        region_id: regionId,
        limit: pageSize,
        offset,
        fields: "handle",
        order: "-created_at",
      });
      for (const p of products ?? []) {
        const h = (p as { handle?: string }).handle?.trim();
        if (h && !slugs.includes(h)) slugs.push(h);
      }
      if (!products?.length || products.length < pageSize) break;
      offset += pageSize;
    }

    return slugs.slice(0, maxItems);
  } catch {
    return [];
  }
}
