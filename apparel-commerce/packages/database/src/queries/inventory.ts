import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAvailableQty(supabase: SupabaseClient, variantId: string): Promise<number> {
  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("qty_delta")
    .eq("variant_id", variantId);

  if (!movements || movements.length === 0) return 0;

  const total = movements.reduce((sum, m) => sum + (m.qty_delta ?? 0), 0);
  return Math.max(0, total);
}
