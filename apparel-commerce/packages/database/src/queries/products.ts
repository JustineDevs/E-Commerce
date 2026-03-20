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

export async function listProducts(
  supabase: SupabaseClient,
  opts: { limit?: number; offset?: number; category?: string } = {}
): Promise<{ products: Product[]; total: number }> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  let query = supabase
    .from("products")
    .select("id, slug, name, description, category, status, brand", { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.category) {
    query = query.eq("category", opts.category);
  }

  const { data: rows, error, count } = await query;

  if (error) throw error;
  if (!rows || rows.length === 0) {
    return { products: [], total: count ?? 0 };
  }

  const ids = rows.map((r) => r.id);

  const [imagesRes, variantsRes] = await Promise.all([
    supabase.from("product_images").select("*").in("product_id", ids).order("sort_order"),
    supabase.from("product_variants").select("*").in("product_id", ids).eq("is_active", true),
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

  return { products, total: count ?? 0 };
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
