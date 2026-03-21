import type { SupabaseClient } from "@supabase/supabase-js";

export async function getShipmentsByOrderId(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("shipments")
    .select("id, order_id, carrier_slug, tracking_number, label_url, status, last_checkpoint, shipped_at, delivered_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
