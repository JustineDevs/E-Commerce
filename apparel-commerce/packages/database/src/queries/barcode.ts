import type { SupabaseClient } from "@supabase/supabase-js";

export async function lookupVariantByBarcode(supabase: SupabaseClient, barcode: string) {
  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      sku,
      barcode,
      size,
      color,
      price,
      product_id,
      products (id, name, slug)
    `)
    .eq("barcode", barcode)
    .eq("is_active", true)
    .single();
  if (error || !data) return null;
  return data;
}

export async function lookupVariantBySku(supabase: SupabaseClient, sku: string) {
  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      sku,
      barcode,
      size,
      color,
      price,
      product_id,
      products (id, name, slug)
    `)
    .eq("sku", sku)
    .eq("is_active", true)
    .single();
  if (error || !data) return null;
  return data;
}
