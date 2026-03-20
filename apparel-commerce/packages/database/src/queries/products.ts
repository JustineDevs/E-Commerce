import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductImage, ProductVariant } from "@apparel-commerce/types";

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  brand: string | null;
};

type DbProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
};

type DbProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  price: number;
  compare_at_price: number | null;
  cost: number | null;
  is_active: boolean;
};

function mapImage(row: DbProductImage): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
  };
}

function mapVariant(row: DbProductVariant): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    barcode: row.barcode,
    size: row.size,
    color: row.color,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    cost: row.cost != null ? Number(row.cost) : null,
    isActive: row.is_active,
  };
}

export type ListProductsOpts = {
  limit?: number;
  offset?: number;
  category?: string;
  size?: string;
  color?: string;
  /** Case-insensitive match on name or slug. */
  search?: string;
  sort?: "newest" | "name_asc" | "price_asc" | "price_desc";
};

function sanitizeIlikeTerm(raw: string): string {
  return raw
    .trim()
    .replace(/\\/g, "")
    .replace(/%/g, "")
    .replace(/_/g, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_CATALOG_SORT_ROWS = 2500;

async function resolveVariantFilterProductIds(
  supabase: SupabaseClient,
  size?: string,
  color?: string
): Promise<string[] | null> {
  if (!size && !color) return null;
  let vq = supabase.from("product_variants").select("product_id").eq("is_active", true);
  if (size) vq = vq.eq("size", size);
  if (color) vq = vq.eq("color", color);
  const { data, error } = await vq;
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((r) => r.product_id))];
  return ids;
}

export async function listActiveCategorySummaries(
  supabase: SupabaseClient
): Promise<{ category: string; count: number }[]> {
  const { data, error } = await supabase.from("products").select("category").eq("status", "active");
  if (error) throw error;
  const tallies = new Map<string, number>();
  for (const row of data ?? []) {
    const key = row.category?.trim() || "Uncategorized";
    tallies.set(key, (tallies.get(key) ?? 0) + 1);
  }
  return [...tallies.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function listVariantFacets(
  supabase: SupabaseClient,
  opts: { category?: string } = {}
): Promise<{ sizes: string[]; colors: string[] }> {
  let pidQuery = supabase.from("products").select("id").eq("status", "active");
  if (opts.category) {
    pidQuery = pidQuery.eq("category", opts.category);
  }
  const { data: prows, error: pErr } = await pidQuery;
  if (pErr) throw pErr;
  const pids = (prows ?? []).map((r) => r.id);
  if (pids.length === 0) {
    return { sizes: [], colors: [] };
  }

  let vq = supabase.from("product_variants").select("size, color").eq("is_active", true);
  vq = vq.in("product_id", pids);
  const { data: vrows, error: vErr } = await vq;
  if (vErr) throw vErr;

  const sizes = [...new Set((vrows ?? []).map((r) => r.size).filter(Boolean))].sort();
  const colors = [...new Set((vrows ?? []).map((r) => r.color).filter(Boolean))].sort();
  return { sizes, colors };
}

export async function listProducts(
  supabase: SupabaseClient,
  opts: ListProductsOpts = {}
): Promise<{ products: Product[]; total: number }> {
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = opts.offset ?? 0;
  const sort = opts.sort ?? "newest";

  const variantIds = await resolveVariantFilterProductIds(supabase, opts.size, opts.color);
  if (variantIds && variantIds.length === 0) {
    return { products: [], total: 0 };
  }

  let base = supabase.from("products").select("id, created_at, name, slug").eq("status", "active");
  if (opts.category) {
    base = base.eq("category", opts.category);
  }
  if (variantIds) {
    base = base.in("id", variantIds);
  }
  const searchTerm = opts.search ? sanitizeIlikeTerm(opts.search) : "";
  if (searchTerm.length > 0) {
    const pattern = `%${searchTerm}%`;
    base = base.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
  }

  const { data: prows, error: listErr } = await base;
  if (listErr) throw listErr;
  if (!prows?.length) {
    return { products: [], total: 0 };
  }

  if (prows.length > MAX_CATALOG_SORT_ROWS) {
    throw new Error("CATALOG_TOO_LARGE");
  }

  const total = prows.length;
  const rowsWithMeta = prows.map((r) => ({
    ...r,
    created_at: r.created_at as string,
  }));

  let orderedIds: string[];

  if (sort === "name_asc") {
    rowsWithMeta.sort((a, b) => a.name.localeCompare(b.name));
    orderedIds = rowsWithMeta.map((r) => r.id);
  } else if (sort === "newest") {
    rowsWithMeta.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    orderedIds = rowsWithMeta.map((r) => r.id);
  } else {
    const ids = rowsWithMeta.map((r) => r.id);
    const { data: vars, error: vErr } = await supabase
      .from("product_variants")
      .select("product_id, price")
      .eq("is_active", true)
      .in("product_id", ids);
    if (vErr) throw vErr;
    const minPrice = new Map<string, number>();
    for (const v of vars ?? []) {
      const pr = Number(v.price);
      const cur = minPrice.get(v.product_id);
      if (cur === undefined || pr < cur) {
        minPrice.set(v.product_id, pr);
      }
    }
    ids.sort((a, b) => {
      const pa = minPrice.get(a) ?? Number.POSITIVE_INFINITY;
      const pb = minPrice.get(b) ?? Number.POSITIVE_INFINITY;
      const cmp = pa - pb;
      return sort === "price_asc" ? cmp : -cmp;
    });
    orderedIds = ids;
  }

  const pageIds = orderedIds.slice(offset, offset + limit);
  if (pageIds.length === 0) {
    return { products: [], total };
  }

  const { data: fullRows, error: fullErr } = await supabase
    .from("products")
    .select("id, slug, name, description, category, status, brand")
    .in("id", pageIds);
  if (fullErr) throw fullErr;

  const rowById = new Map((fullRows ?? []).map((r) => [r.id, r]));
  const rows = pageIds.map((id) => rowById.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));

  const [imagesRes, variantsRes] = await Promise.all([
    supabase.from("product_images").select("*").in("product_id", pageIds).order("sort_order"),
    supabase.from("product_variants").select("*").in("product_id", pageIds).eq("is_active", true),
  ]);

  if (imagesRes.error) throw imagesRes.error;
  if (variantsRes.error) throw variantsRes.error;

  const imagesByProduct = new Map<string, DbProductImage[]>();
  for (const img of imagesRes.data ?? []) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  }

  const variantsByProduct = new Map<string, DbProductVariant[]>();
  for (const v of variantsRes.data ?? []) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const products: Product[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    status: p.status,
    brand: p.brand,
    images: (imagesByProduct.get(p.id) ?? []).sort((a, b) => a.sort_order - b.sort_order).map(mapImage),
    variants: (variantsByProduct.get(p.id) ?? []).map(mapVariant),
  }));

  return { products, total };
}

export async function getProductBySlug(supabase: SupabaseClient, slug: string): Promise<Product | null> {
  const { data: rows, error } = await supabase
    .from("products")
    .select("id, slug, name, description, category, status, brand")
    .eq("slug", slug)
    .eq("status", "active")
    .limit(1);

  if (error) throw error;
  const p = rows?.[0];
  if (!p) return null;

  const [imagesRes, variantsRes] = await Promise.all([
    supabase.from("product_images").select("*").eq("product_id", p.id).order("sort_order"),
    supabase.from("product_variants").select("*").eq("product_id", p.id).eq("is_active", true),
  ]);

  if (imagesRes.error) throw imagesRes.error;
  if (variantsRes.error) throw variantsRes.error;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    status: p.status,
    brand: p.brand,
    images: (imagesRes.data ?? []).map(mapImage),
    variants: (variantsRes.data ?? []).map(mapVariant),
  };
}
