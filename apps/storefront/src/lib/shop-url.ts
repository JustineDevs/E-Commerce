export type ShopQuery = {
  category?: string;
  size?: string;
  color?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Catalog search (name / slug). */
  search?: string;
  sort?: string;
  offset?: number;
};

export function shopHref(q: ShopQuery): string {
  const params = new URLSearchParams();
  if (q.category?.trim()) params.set("category", q.category.trim());
  if (q.size?.trim()) params.set("size", q.size.trim());
  if (q.color?.trim()) params.set("color", q.color.trim());
  if (q.brand?.trim()) params.set("brand", q.brand.trim());
  if (q.minPrice != null && Number.isFinite(q.minPrice) && q.minPrice >= 0) {
    params.set("minPrice", String(q.minPrice));
  }
  if (q.maxPrice != null && Number.isFinite(q.maxPrice) && q.maxPrice >= 0) {
    params.set("maxPrice", String(q.maxPrice));
  }
  if (q.search?.trim()) params.set("q", q.search.trim());
  if (q.sort?.trim()) params.set("sort", q.sort.trim());
  if (q.offset != null && q.offset > 0) params.set("offset", String(q.offset));
  const s = params.toString();
  return s ? `/shop?${s}` : "/shop";
}
