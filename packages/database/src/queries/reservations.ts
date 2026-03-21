import type { SupabaseClient } from "@supabase/supabase-js";

export async function sumActiveReservedQtyByVariant(
  supabase: SupabaseClient,
  variantIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (variantIds.length === 0) return map;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("stock_reservations")
    .select("variant_id, qty")
    .eq("status", "active")
    .gt("expires_at", now)
    .in("variant_id", variantIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const v = row.variant_id as string;
    map.set(v, (map.get(v) ?? 0) + (row.qty ?? 0));
  }
  return map;
}

export async function releaseExpiredReservations(supabase: SupabaseClient): Promise<{ expired: number; ordersCancelled: number }> {
  const now = new Date().toISOString();

  const { data: toExpire, error: selErr } = await supabase
    .from("stock_reservations")
    .select("id, order_id")
    .eq("status", "active")
    .lt("expires_at", now);
  if (selErr) throw selErr;

  const orderIds = [...new Set((toExpire ?? []).map((r) => r.order_id).filter(Boolean))] as string[];

  if (toExpire?.length) {
    const ids = toExpire.map((r) => r.id);
    const { error: upErr } = await supabase.from("stock_reservations").update({ status: "expired" }).in("id", ids);
    if (upErr) throw upErr;
  }

  let ordersCancelled = 0;
  for (const oid of orderIds) {
    const { data: order } = await supabase.from("orders").select("id, status").eq("id", oid).single();
    if (!order || order.status !== "pending_payment") continue;

    const { count, error: cErr } = await supabase
      .from("stock_reservations")
      .select("id", { count: "exact", head: true })
      .eq("order_id", oid)
      .eq("status", "active");
    if (cErr) throw cErr;
    if ((count ?? 0) === 0) {
      const { error: oErr } = await supabase.from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", oid);
      if (oErr) throw oErr;
      ordersCancelled += 1;
    }
  }

  return { expired: toExpire?.length ?? 0, ordersCancelled };
}
