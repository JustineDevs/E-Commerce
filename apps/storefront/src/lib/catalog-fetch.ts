/**
 * Storefront catalog: re-exports Medusa Store API fetchers from `catalog-medusa-fetch.ts`.
 * @see catalog-medusa-fetch.ts for implementation.
 */
export type {
  CatalogQuery,
  CategorySummariesResult,
  CategorySummary,
  CommerceFetchFailure,
  FeaturedProductsResult,
  ProductBySlugResult,
  ProductsPageResult,
  VariantFacets,
  VariantFacetsResult,
} from "./catalog-medusa-fetch";
export {
  catalogServiceError,
  fetchCategorySummaries,
  fetchFeaturedProducts,
  fetchProductBySlug,
  fetchProductSlugsForSitemap,
  fetchProductsPage,
  fetchRelatedProducts,
  fetchVariantFacets,
} from "./catalog-medusa-fetch";
