import type {
  CategorySummariesResult,
  CommerceFetchFailure,
  ProductsPageResult,
  VariantFacetsResult,
} from "./catalog-fetch";

export function firstCommerceFailure(
  page: ProductsPageResult,
  categories: CategorySummariesResult,
  facets: VariantFacetsResult,
): CommerceFetchFailure | null {
  if (page.kind !== "ok") {
    return page;
  }
  if (categories.kind !== "ok") {
    return categories;
  }
  if (facets.kind !== "ok") {
    return facets;
  }
  return null;
}
