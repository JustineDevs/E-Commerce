import { medusaAdminFetch } from "@/lib/medusa-admin-http";

export type AdminProductCategoryRow = {
  id: string;
  name: string;
  handle: string;
};

/**
 * Lists Medusa product categories for catalog assignment (same data the shop uses for filters).
 */
export async function listAdminProductCategories(): Promise<
  AdminProductCategoryRow[]
> {
  try {
    const res = await medusaAdminFetch(
      "/admin/product-categories?limit=200&fields=id,name,handle",
    );
    if (!res.ok) return [];
    const j = (await res.json()) as {
      product_categories?: Array<{
        id?: string;
        name?: string;
        handle?: string;
      }>;
    };
    return (j.product_categories ?? []).map((c) => ({
      id: String(c.id ?? ""),
      name: String(c.name ?? ""),
      handle: String(c.handle ?? ""),
    }));
  } catch {
    return [];
  }
}
