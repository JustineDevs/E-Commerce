import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryRow = {
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  available: number;
};

export async function listInventoryWithStock(supabase: SupabaseClient): Promise<InventoryRow[]> {
  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, sku, size, color, product_id, products(name)")
    .eq("is_active", true);

  if (vErr) throw vErr;
  if (!variants || variants.length === 0) return [];

  const variantsById = new Map(variants.map((v) => [v.id, v]));
  const variantIds = variants.map((v) => v.id);

  const { data: movements, error: mErr } = await supabase
    .from("inventory_movements")
    .select("variant_id, qty_delta")
    .in("variant_id", variantIds);

  if (mErr) throw mErr;

  const qtyByVariant = new Map<string, number>();
  for (const m of movements ?? []) {
    const prev = qtyByVariant.get(m.variant_id) ?? 0;
    qtyByVariant.set(m.variant_id, prev + (m.qty_delta ?? 0));
  }

  return variants.map((v) => {
    const product = v.products as { name?: string } | null;
    const productName = product?.name ?? "";
    const available = Math.max(0, qtyByVariant.get(v.id) ?? 0);
    return {
      variantId: v.id,
      productName,
      sku: v.sku,
      size: v.size,
      color: v.color,
      available,
    };
  });
}

export async function getDefaultLocationId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("inventory_locations")
    .select("id")
    .eq("kind", "warehouse")
    .limit(1)
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function getAvailableQty(supabase: SupabaseClient, variantId: string): Promise<number> {
  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("qty_delta")
    .eq("variant_id", variantId);

  if (!movements || movements.length === 0) return 0;

  const total = movements.reduce((sum, m) => sum + (m.qty_delta ?? 0), 0);
  return Math.max(0, total);
}
