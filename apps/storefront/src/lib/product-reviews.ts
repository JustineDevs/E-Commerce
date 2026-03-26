import { createClient } from "@supabase/supabase-js";

export type ProductReviewRow = {
  id: string;
  rating: number;
  author_name: string;
  body: string;
  created_at: string;
};

/**
 * Loads reviews for a PDP: matches Medusa product id when provided (canonical), else slug-only rows.
 */
export async function fetchProductReviews(
  productSlug: string,
  options?: { medusaProductId?: string; limit?: number },
): Promise<ProductReviewRow[]> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  const slug = productSlug.trim();
  const mid = options?.medusaProductId?.trim();
  const limit = options?.limit ?? 50;
  if (!url || !key || (!slug && !mid)) return [];
  const sb = createClient(url, key);
  let q = sb
    .from("product_reviews")
    .select("id,rating,author_name,body,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (mid && slug) {
    q = q.or(`medusa_product_id.eq.${mid},product_slug.eq.${slug}`);
  } else if (mid) {
    q = q.eq("medusa_product_id", mid);
  } else {
    q = q.eq("product_slug", slug);
  }
  const { data, error } = await q;
  if (error || !data) return [];
  const seen = new Set<string>();
  return (data as ProductReviewRow[]).filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
