import type { SupabaseClient } from "@supabase/supabase-js";

export async function listOrders(
  supabase: SupabaseClient,
  opts: { limit?: number; offset?: number; status?: string } = {}
) {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  let query = supabase
    .from("orders")
    .select("id, order_number, customer_id, status, channel, currency, subtotal, shipping_fee, grand_total, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: data ?? [], total: count ?? 0 };
}

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
