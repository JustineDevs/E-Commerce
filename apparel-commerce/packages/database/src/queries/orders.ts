import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrderById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_id, status, channel, currency, subtotal, shipping_fee, grand_total, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

export async function getOrderByNumber(supabase: SupabaseClient, orderNumber: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_id, status, channel, currency, subtotal, shipping_fee, grand_total, created_at")
    .eq("order_number", orderNumber)
    .single();
  if (error || !data) return null;
  return data;
}
