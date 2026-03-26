/**
 * Commerce domain facade (store catalog, prices, checkout-backed data).
 *
 * Abstraction: UI and route handlers depend on these operations and names
 * (products, store, catalog) rather than on a specific commerce engine SDK.
 *
 * Encapsulation: Medusa HTTP, env keys, and response mapping stay in
 * `lib/medusa-*-bridge.ts` and `lib/medusa-admin-http.ts`. Import those only
 * from this module or other `domain/*` facades, not from pages.
 */

import {
  fetchMedusaProductsListForAdmin,
  getMedusaAdminProductEditUrl,
  getMedusaAdminProductsIndexUrl,
  type MedusaProductListRow,
} from "@/lib/medusa-catalog-bridge";

export type StoreProductListItem = MedusaProductListRow;

export type StoreProductListResult = {
  items: StoreProductListItem[];
  total: number;
  /** True when the store service could not be reached (booting, network, or config). */
  storeUnavailable?: boolean;
};

export async function listProducts(params: {
  limit?: number;
  offset?: number;
  q?: string;
}): Promise<StoreProductListResult> {
  const r = await fetchMedusaProductsListForAdmin(params);
  return {
    items: r.products,
    total: r.count,
    storeUnavailable: r.commerceUnavailable,
  };
}

/** URL of the full catalog editor shipped with the commerce backend (advanced screens). */
export function fullCatalogEditorUrl(): string {
  return getMedusaAdminProductsIndexUrl();
}

/** Deep link to edit one product in the commerce backend UI. */
export function productEditorUrl(productId: string): string {
  return getMedusaAdminProductEditUrl(productId);
}
