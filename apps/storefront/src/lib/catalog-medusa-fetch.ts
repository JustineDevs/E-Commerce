/**
 * Medusa Store API catalog queries (listing, PDP, facets, categories, sitemap).
 * Imported by `catalog-fetch.ts`, which re-exports the public surface.
 */
import type { Product } from "@apparel-commerce/types";
import {
  catalogProductFromMedusaRaw,
  medusaProductRawHasSellableVariant,
  minVariantPrice,
  productMatchesBrand,
  productMatchesPriceRange,
  productMatchesVariantFilters,
} from "./medusa-catalog-mapper";
import { createStorefrontMedusaSdk } from "./medusa-sdk";
import {
  countSellableProductsInStoreList,
  MEDUSA_PRODUCT_STOCK_FIELDS,
} from "./medusa-store-sellable-count";
import { getMedusaStoreBaseUrl } from "@apparel-commerce/sdk";
import {
  getMedusaPublishableKey,
  getMedusaRegionId,
  withSalesChannelId,
} from "./storefront-medusa-env";

export type CatalogQuery = {
  limit?: number;
  offset?: number;
  category?: string;
  size?: string;
  color?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
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
  | {
      kind: "ok";
      facets: { sizes: string[]; colors: string[]; brands: string[] };
    }
  | CommerceFetchFailure;

export type FeaturedProductsResult =
  | { kind: "ok"; products: Product[] }
  | CommerceFetchFailure;

function misconfigured(detail: string): CommerceFetchFailure {
  return { kind: "misconfigured", detail };
}

function isLikelyUnreachableMedusaError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("econnrefused") ||
    m.includes("enotfound") ||
    m.includes("networkerror") ||
    m.includes("socket hang up") ||
    m.includes("certificate") ||
    m.includes("ssl") ||
    m.includes("tls")
  );
}

export function catalogServiceError(err: unknown): CommerceFetchFailure {
  const message = err instanceof Error ? err.message : String(err);
  if (
    message.includes("Invalid URL") ||
    message.toLowerCase().includes("invalid url")
  ) {
    return {
      kind: "misconfigured",
      detail:
        "Store URL is missing or invalid. Set MEDUSA_BACKEND_URL and NEXT_PUBLIC_MEDUSA_URL to your public store address (deployment env on Vercel, or local URL in development).",
    };
  }
  if (isLikelyUnreachableMedusaError(message)) {
    const base = getMedusaStoreBaseUrl();
    const loopback =
      base.includes("localhost") || base.includes("127.0.0.1");
    return {
      kind: "misconfigured",
      detail: loopback
        ? `Cannot reach ${base} from the website server. Start your local store service, or set MEDUSA_BACKEND_URL / NEXT_PUBLIC_MEDUSA_URL to a reachable HTTPS URL. Hosted sites cannot use localhost.`
        : `Cannot reach ${base} (${message}). Confirm the store is running and allows this site (CORS).`,
    };
  }
  return { kind: "service_error", message };
}

const MEDUSA_LIST_FIELDS =
  "*variants,*variants.calculated_price,+variants.inventory_quantity,*variants.options,*variants.barcode,*categories,*options,+thumbnail,*images,+metadata,+created_at";

function requireMedusaClientConfig():
  | { ok: true }
  | { ok: false; reason: CommerceFetchFailure } {
  const regionId = getMedusaRegionId();
  const key = getMedusaPublishableKey();
  if (!key?.trim()) {
    return {
      ok: false,
      reason: misconfigured(
        "Missing public store key (NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY or MEDUSA_PUBLISHABLE_API_KEY). Copy from your store admin under Developer → Publishable API keys.",
      ),
    };
  }
  if (!regionId?.trim()) {
    return {
      ok: false,
      reason: misconfigured(
        "Missing sales region id (NEXT_PUBLIC_MEDUSA_REGION_ID or MEDUSA_REGION_ID). Set the region your store uses (for example from your store admin).",
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
  } as Parameters<typeof sdk.store.category.list>[0]);
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
    const priceSort =
      options.sort === "price_asc" || options.sort === "price_desc";

    const collected: Product[] = [];
    let apiOffset = 0;
    const pageSize = 80;
    const targetEnd = offset + limit;
    const maxScan = 4000;

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
        withSalesChannelId(listParams) as Parameters<
          typeof sdk.store.product.list
        >[0],
      );

      for (const raw of rawList ?? []) {
        const p = catalogProductFromMedusaRaw(raw as never);
        if (!p) continue;
        if (!productMatchesVariantFilters(p, options.size, options.color)) {
          continue;
        }
        if (!productMatchesBrand(p, options.brand)) continue;
        if (!productMatchesPriceRange(p, options.minPrice, options.maxPrice)) {
          continue;
        }
        collected.push(p);
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
    } else if (options.sort === "name_asc") {
      collected.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      collected.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
    }

    return {
      kind: "ok",
      products: collected.slice(offset, offset + limit),
      total: collected.length,
    };
  } catch (e) {
    return catalogServiceError(e);
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
    const { products } = await sdk.store.product.list(
      withSalesChannelId({
        region_id: regionId,
        handle: slug,
        limit: 1,
        fields: MEDUSA_LIST_FIELDS,
      }) as Parameters<typeof sdk.store.product.list>[0],
    );
    const raw = products?.[0];
    if (!raw) {
      return { kind: "not_found" };
    }
    const product = catalogProductFromMedusaRaw(raw as never);
    if (!product) {
      return { kind: "not_found" };
    }
    return { kind: "ok", product };
  } catch (e) {
    return catalogServiceError(e);
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
    } as Parameters<typeof sdk.store.category.list>[0]);
    const rows = product_categories ?? [];
    const summaries: { category: string; count: number }[] = [];
    for (const c of rows) {
      const id = typeof c.id === "string" ? c.id : "";
      const label = (c.name ?? c.handle ?? id ?? "").trim();
      if (!label || !id) continue;
      const count = await countSellableProductsInStoreList(sdk, regionId, {
        categoryId: id,
        maxScan: 5000,
      });
      summaries.push({ category: label, count });
    }
    return {
      kind: "ok",
      summaries: summaries.filter((s) => s.count > 0),
    };
  } catch (e) {
    return catalogServiceError(e);
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
    const sizes = new Set<string>();
    const colors = new Set<string>();
    const brands = new Set<string>();
    let facetOffset = 0;
    const facetPageSize = 100;
    const facetMaxScan = 4000;
    while (facetOffset < facetMaxScan) {
      const { products } = await sdk.store.product.list(
        withSalesChannelId({
          region_id: regionId,
          ...(categoryId ? { category_id: categoryId } : {}),
          limit: facetPageSize,
          offset: facetOffset,
          fields: MEDUSA_LIST_FIELDS,
        }) as Parameters<typeof sdk.store.product.list>[0],
      );
      for (const pr of products ?? []) {
        const p = catalogProductFromMedusaRaw(pr as never);
        if (!p) continue;
        if (p.brand?.trim()) brands.add(p.brand.trim());
        for (const v of p.variants) {
          if (v.size) sizes.add(v.size);
          if (v.color) colors.add(v.color);
        }
      }
      facetOffset += facetPageSize;
      if (!products?.length || products.length < facetPageSize) {
        break;
      }
    }
    return {
      kind: "ok",
      facets: {
        sizes: [...sizes].sort(),
        colors: [...colors].sort((a, b) => a.localeCompare(b)),
        brands: [...brands].sort((a, b) => a.localeCompare(b)),
      },
    };
  } catch (e) {
    return catalogServiceError(e);
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
): Promise<FeaturedProductsResult> {
  const r = await fetchMedusaProductsPage(limit, { sort: "newest" });
  if (r.kind !== "ok") {
    return r;
  }
  return { kind: "ok", products: r.products };
}

export async function fetchRelatedProducts(
  current: Product,
  limit = 4,
): Promise<FeaturedProductsResult> {
  const gate = requireMedusaClientConfig();
  if (!gate.ok) {
    return gate.reason;
  }

  const wanted = current.relatedHandles
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, Math.max(limit, 8));
  if (wanted.length > 0) {
    const out: Product[] = [];
    for (const handle of wanted) {
      const r = await fetchMedusaProductBySlug(handle);
      if (r.kind === "ok" && r.product.id !== current.id) {
        out.push(r.product);
      }
      if (out.length >= limit) break;
    }
    if (out.length > 0) {
      return { kind: "ok", products: out.slice(0, limit) };
    }
  }

  if (!current.category?.trim()) {
    return { kind: "ok", products: [] };
  }
  const r = await fetchMedusaProductsPage(limit + 10, {
    category: current.category,
    sort: "newest",
  });
  if (r.kind !== "ok") {
    return r;
  }
  const rest = r.products.filter((p) => p.id !== current.id);
  return { kind: "ok", products: rest.slice(0, limit) };
}

export async function fetchProductBySlug(
  slug: string,
): Promise<ProductBySlugResult> {
  return fetchMedusaProductBySlug(slug);
}

export type CategorySummary = { category: string; count: number };

export async function fetchCategorySummaries(): Promise<CategorySummariesResult> {
  return fetchMedusaCategorySummaries();
}

export type VariantFacets = {
  sizes: string[];
  colors: string[];
  brands: string[];
};

export async function fetchVariantFacets(
  category: string | undefined,
): Promise<VariantFacetsResult> {
  return fetchMedusaVariantFacets(category);
}

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
      const { products } = await sdk.store.product.list(
        withSalesChannelId({
          region_id: regionId,
          limit: pageSize,
          offset,
          fields: `${MEDUSA_PRODUCT_STOCK_FIELDS},handle`,
          order: "-created_at",
        }) as Parameters<typeof sdk.store.product.list>[0],
      );
      for (const p of products ?? []) {
        if (!medusaProductRawHasSellableVariant(p as never)) continue;
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
