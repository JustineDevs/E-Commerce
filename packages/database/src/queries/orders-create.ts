import type { SupabaseClient } from "@supabase/supabase-js";
import { getDefaultLocationId } from "./inventory";

export type CreateOrderItem = {
  variantId: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
};

export type CreateOrderInput = {
  channel: "web" | "pos";
  status: string;
  items: CreateOrderItem[];
  createdBy?: string;
};

const ALLOWED_ORDER_CREATE_STATUSES = new Set(["paid", "pending_payment", "draft"]);

function normalizeStatus(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${r}`;
}

export async function createOrder(supabase: SupabaseClient, input: CreateOrderInput) {
  const statusNorm = normalizeStatus(input.status);
  if (!ALLOWED_ORDER_CREATE_STATUSES.has(statusNorm)) {
    throw new Error(`INVALID_ORDER_STATUS:${input.status}`);
  }

  if (input.channel === "web" && statusNorm !== "pending_payment" && statusNorm !== "draft") {
    throw new Error("WEB_ORDER_INVALID_STATUS");
  }

  if (input.channel === "pos" && statusNorm !== "paid") {
    throw new Error("POS_ORDER_MUST_BE_PAID");
  }

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const taxTotal = subtotal * 0.085;
  const grandTotal = subtotal + taxTotal;
  const orderNumber = generateOrderNumber();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      channel: input.channel,
      status: statusNorm,
      currency: "PHP",
      subtotal,
      discount_total: 0,
      shipping_fee: 0,
      tax_total: taxTotal,
      grand_total: grandTotal,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (orderErr || !order) throw orderErr ?? new Error("Failed to create order");

  const orderItems = input.items.map((i) => ({
    order_id: order.id,
    variant_id: i.variantId,
    sku_snapshot: i.sku,
    product_name_snapshot: i.productName,
    size_snapshot: i.size,
    color_snapshot: i.color,
    unit_price: i.unitPrice,
    quantity: i.quantity,
    line_total: i.unitPrice * i.quantity,
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
  if (itemsErr) throw itemsErr;

  const mustDeductStock = statusNorm === "paid";
  if (mustDeductStock) {
    const locationId = await getDefaultLocationId(supabase);
    if (locationId) {
      const movements = input.items.map((i) => ({
        variant_id: i.variantId,
        location_id: locationId,
        qty_delta: -i.quantity,
        reason: "sale",
        reference_type: "order",
        reference_id: order.id,
      }));
      const { error: movErr } = await supabase.from("inventory_movements").insert(movements);
      if (movErr) throw movErr;
    }
  }

  return { id: order.id, orderNumber };
}
