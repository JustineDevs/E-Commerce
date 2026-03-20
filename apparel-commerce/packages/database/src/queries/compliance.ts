import type { SupabaseClient } from "@supabase/supabase-js";

export type DataSubjectExport = {
  user: unknown;
  addresses: unknown[];
  orders: unknown[];
  orderItems: unknown[];
  payments: unknown[];
};

export async function exportDataSubjectByEmail(supabase: SupabaseClient, email: string): Promise<DataSubjectExport | null> {
  const { data: user, error: uErr } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  if (uErr) throw uErr;
  if (!user) return null;

  const userId = user.id as string;

  const [{ data: addresses }, { data: orders }] = await Promise.all([
    supabase.from("addresses").select("*").eq("user_id", userId),
    supabase.from("orders").select("*").eq("customer_id", userId),
  ]);

  const orderIds = (orders ?? []).map((o) => o.id as string);
  let orderItems: unknown[] = [];
  let payments: unknown[] = [];

  if (orderIds.length > 0) {
    const [oi, pay] = await Promise.all([
      supabase.from("order_items").select("*").in("order_id", orderIds),
      supabase.from("payments").select("*").in("order_id", orderIds),
    ]);
    orderItems = oi.data ?? [];
    payments = pay.data ?? [];
  }

  return {
    user,
    addresses: addresses ?? [],
    orders: orders ?? [],
    orderItems,
    payments,
  };
}

export async function anonymizeStaleOrderAddresses(supabase: SupabaseClient, olderThanIso: string): Promise<{ addressesUpdated: number }> {
  const { data: oldOrders, error: oErr } = await supabase
    .from("orders")
    .select("shipping_address_id, billing_address_id")
    .lt("created_at", olderThanIso);
  if (oErr) throw oErr;

  const ids = new Set<string>();
  for (const o of oldOrders ?? []) {
    if (o.shipping_address_id) ids.add(o.shipping_address_id as string);
    if (o.billing_address_id) ids.add(o.billing_address_id as string);
  }

  const idList = [...ids];
  if (idList.length === 0) return { addressesUpdated: 0 };

  const { data: updated, error: uErr } = await supabase
    .from("addresses")
    .update({
      full_name: "[redacted]",
      line1: "[redacted]",
      line2: null,
      phone: null,
      barangay: null,
      postal_code: null,
    })
    .in("id", idList)
    .select("id");
  if (uErr) throw uErr;

  return { addressesUpdated: updated?.length ?? 0 };
}
