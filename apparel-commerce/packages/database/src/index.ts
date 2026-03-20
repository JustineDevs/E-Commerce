import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

export {
  listProducts,
  getProductBySlug,
  listActiveCategorySummaries,
  listVariantFacets,
} from "./queries/products";
export type { ListProductsOpts } from "./queries/products";
export { listOrders, getOrderById, getOrderByNumber } from "./queries/orders";
export { createOrder } from "./queries/orders-create";
export { listInventoryWithStock, getAvailableQty } from "./queries/inventory";
export { releaseExpiredReservations, sumActiveReservedQtyByVariant } from "./queries/reservations";
export {
  createPendingCheckoutOrder,
  fulfillOrderAfterLemonSqueezyPayment,
  attachLemonSqueezyCheckoutToPayment,
  processLemonSqueezyOrderWebhook,
} from "./queries/checkout";
export { parseLemonOrderPaidWebhook } from "./queries/lemonsqueezy-webhook";
export { upsertShipmentFromAftershipPayload } from "./queries/aftership-webhook";
export { getShipmentsByOrderId } from "./queries/shipments";
export { updateOrderStatusStaff, createStaffShipment } from "./queries/order-fulfillment";
export type { StaffShipmentInput } from "./queries/order-fulfillment";
export { lookupVariantByBarcode, lookupVariantBySku } from "./queries/barcode";
export { upsertOAuthUser, isStaffRole } from "./queries/admin-users";
export { exportDataSubjectByEmail, anonymizeStaleOrderAddresses } from "./queries/compliance";
