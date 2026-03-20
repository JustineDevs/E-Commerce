import type { SupabaseClient } from "@supabase/supabase-js";
import { getDefaultLocationId, getAvailableQty } from "./inventory";
import { releaseExpiredReservations } from "./reservations";
import { parseLemonOrderPaidWebhook } from "./lemonsqueezy-webhook";

export type CheckoutCartLine = { variantId: string; quantity: number };

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${r}`;
}

export async function createPendingCheckoutOrder(
  supabase: SupabaseClient,
  input: { items: CheckoutCartLine[]; reservationTtlMinutes: number }
): Promise<{
  orderId: string;
  orderNumber: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}> {
  await releaseExpiredReservations(supabase);

  const merged = new Map<string, number>();
  for (const i of input.items) {
    if (!i.variantId || i.quantity <= 0) continue;
    merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.quantity);
  }
  const lines = [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
  if (lines.length === 0) throw new Error("EMPTY_CART");

  const variantIds = [...new Set(lines.map((l) => l.variantId))];
  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, sku, size, color, price, product_id, is_active, products!inner(name)")
    .in("id", variantIds)
    .eq("is_active", true);
  if (vErr) throw vErr;
  const byId = new Map((variants ?? []).map((v) => [v.id as string, v]));
  if (byId.size !== variantIds.length) throw new Error("INVALID_VARIANT");

  for (const line of lines) {
    const avail = await getAvailableQty(supabase, line.variantId);
    if (avail < line.quantity) throw new Error("INSUFFICIENT_STOCK");
  }

  let subtotal = 0;
  const snapshots: Array<{
    variantId: string;
    sku: string;
    productName: string;
    size: string;
    color: string;
    unitPrice: number;
    quantity: number;
  }> = [];

  for (const line of lines) {
    const v = byId.get(line.variantId)!;
    const prod = v.products as { name?: string };
    const unitPrice = Number(v.price);
    subtotal += unitPrice * line.quantity;
    snapshots.push({
      variantId: line.variantId,
      sku: v.sku as string,
      productName: prod?.name ?? "",
      size: v.size as string,
      color: v.color as string,
      unitPrice,
      quantity: line.quantity,
    });
  }

  const taxTotal = Math.round(subtotal * 0.085 * 100) / 100;
  const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;
  const orderNumber = generateOrderNumber();
  const locationId = await getDefaultLocationId(supabase);
  if (!locationId) throw new Error("NO_WAREHOUSE");

  const expiresAt = new Date(Date.now() + input.reservationTtlMinutes * 60_000).toISOString();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      channel: "web",
      status: "pending_payment",
      currency: "PHP",
      subtotal,
      discount_total: 0,
      shipping_fee: 0,
      tax_total: taxTotal,
      grand_total: grandTotal,
    })
    .select("id")
    .single();

  if (orderErr || !order) throw orderErr ?? new Error("ORDER_INSERT_FAILED");

  const orderItems = snapshots.map((s) => ({
    order_id: order.id,
    variant_id: s.variantId,
    sku_snapshot: s.sku,
    product_name_snapshot: s.productName,
    size_snapshot: s.size,
    color_snapshot: s.color,
    unit_price: s.unitPrice,
    quantity: s.quantity,
    line_total: s.unitPrice * s.quantity,
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw itemsErr;
  }

  const reservations = snapshots.map((s) => ({
    variant_id: s.variantId,
    location_id: locationId,
    order_id: order.id,
    qty: s.quantity,
    status: "active",
    expires_at: expiresAt,
  }));

  const { error: resErr } = await supabase.from("stock_reservations").insert(reservations);
  if (resErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw resErr;
  }

  const { error: payErr } = await supabase.from("payments").insert({
    order_id: order.id,
    provider: "lemonsqueezy",
    status: "pending",
    amount: grandTotal,
    currency: "PHP",
  });
  if (payErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw payErr;
  }

  return { orderId: order.id, orderNumber, subtotal, taxTotal, grandTotal };
}

export async function fulfillOrderAfterLemonSqueezyPayment(
  supabase: SupabaseClient,
  input: { orderId: string; lemonsqueezyOrderId: string }
): Promise<boolean> {
  const { data: updated, error: upOrderErr } = await supabase
    .from("orders")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", input.orderId)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();

  if (upOrderErr) throw upOrderErr;
  if (!updated) {
    const { data: existing } = await supabase.from("orders").select("status").eq("id", input.orderId).single();
    return existing?.status === "paid";
  }

  const { error: payErr } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      external_order_id: input.lemonsqueezyOrderId,
    })
    .eq("order_id", input.orderId)
    .eq("status", "pending");
  if (payErr) throw payErr;

  const locationId = await getDefaultLocationId(supabase);
  if (!locationId) throw new Error("NO_WAREHOUSE");

  const { data: items, error: itemsErr } = await supabase.from("order_items").select("variant_id, quantity").eq("order_id", input.orderId);
  if (itemsErr) throw itemsErr;

  const movements = (items ?? []).map((row) => ({
    variant_id: row.variant_id as string,
    location_id: locationId,
    qty_delta: -(row.quantity as number),
    reason: "sale" as const,
    reference_type: "order",
    reference_id: input.orderId,
  }));

  if (movements.length > 0) {
    const { error: movErr } = await supabase.from("inventory_movements").insert(movements);
    if (movErr) throw movErr;
  }

  const { error: relErr } = await supabase.from("stock_reservations").delete().eq("order_id", input.orderId);
  if (relErr) throw relErr;

  return true;
}

export async function attachLemonSqueezyCheckoutToPayment(
  supabase: SupabaseClient,
  orderId: string,
  checkoutId: string,
  checkoutUrl: string
): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({ checkout_id: checkoutId, payment_link_url: checkoutUrl })
    .eq("order_id", orderId)
    .eq("status", "pending");
  if (error) throw error;
}

export async function processLemonSqueezyOrderWebhook(supabase: SupabaseClient, payload: Record<string, unknown>): Promise<void> {
  const parsed = parseLemonOrderPaidWebhook(payload);
  if (!parsed) return;

  await fulfillOrderAfterLemonSqueezyPayment(supabase, {
    orderId: parsed.orderId,
    lemonsqueezyOrderId: parsed.lemonsqueezyOrderId,
  });
}
