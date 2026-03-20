import type { SupabaseClient } from "@supabase/supabase-js";

const STAFF_NEXT_STATUS: Record<string, Set<string>> = {
  draft: new Set(["cancelled"]),
  pending_payment: new Set(["cancelled"]),
  paid: new Set(["ready_to_ship", "shipped", "cancelled"]),
  ready_to_ship: new Set(["shipped", "cancelled"]),
  shipped: new Set(["delivered", "cancelled"]),
  delivered: new Set(["refunded"]),
  cancelled: new Set(),
  refunded: new Set(),
};

export async function updateOrderStatusStaff(
  supabase: SupabaseClient,
  orderId: string,
  nextStatus: string
): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();
  if (fetchErr) throw fetchErr;
  if (!row) throw new Error("ORDER_NOT_FOUND");

  const current = String(row.status);
  const allowed = STAFF_NEXT_STATUS[current];
  if (!allowed || !allowed.has(nextStatus)) {
    throw new Error(`INVALID_STATUS_TRANSITION:${current}->${nextStatus}`);
  }

  const { error: updErr } = await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);
  if (updErr) throw updErr;
}

export type StaffShipmentInput = {
  orderId: string;
  trackingNumber: string;
  carrierSlug?: string;
  labelUrl?: string | null;
};

export async function createStaffShipment(supabase: SupabaseClient, input: StaffShipmentInput): Promise<{ shipmentId: string }> {
  const tn = input.trackingNumber.trim();
  if (!tn) throw new Error("TRACKING_NUMBER_REQUIRED");

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", input.orderId)
    .single();
  if (oErr) throw oErr;
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const st = String(order.status);
  if (!["paid", "ready_to_ship", "shipped"].includes(st)) {
    throw new Error("ORDER_NOT_FULFILLABLE");
  }

  const carrier = (input.carrierSlug ?? "jtexpress-ph").trim() || "jtexpress-ph";

  const { data: inserted, error: insErr } = await supabase
    .from("shipments")
    .insert({
      order_id: input.orderId,
      carrier_slug: carrier,
      tracking_number: tn,
      label_url: input.labelUrl ?? null,
      status: "pending",
      shipped_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      throw new Error("TRACKING_NUMBER_EXISTS");
    }
    throw insErr;
  }

  if (st === "paid") {
    const { error: uErr } = await supabase.from("orders").update({ status: "ready_to_ship" }).eq("id", input.orderId);
    if (uErr) throw uErr;
  }

  return { shipmentId: inserted.id as string };
}
