export type ShopQuery = {
  category?: string;
  size?: string;
  color?: string;
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
  if (q.search?.trim()) params.set("q", q.search.trim());
  if (q.sort?.trim()) params.set("sort", q.sort.trim());
  if (q.offset != null && q.offset > 0) params.set("offset", String(q.offset));
  const s = params.toString();
  return s ? `/shop?${s}` : "/shop";
}
