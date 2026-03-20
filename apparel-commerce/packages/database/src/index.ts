import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

export { listProducts, getProductBySlug } from "./queries/products";
export { getOrderById, getOrderByNumber } from "./queries/orders";
export { getShipmentsByOrderId } from "./queries/shipments";
export { getAvailableQty } from "./queries/inventory";
export { lookupVariantByBarcode, lookupVariantBySku } from "./queries/barcode";
