/**
 * @deprecated Legacy Supabase-backed commerce helpers. Medusa is the commerce system of record.
 * These exports are retained only for migration scripts and data export tooling.
 * Do not use for new features.
 *
 * Legacy commerce write paths — Supabase mutations for pre-Medusa cutover flows.
 * Do not import from apps; Medusa is the system of record. Use only for migration
 * scripts or explicit legacy tooling.
 * @see internal/docs/exclusive/fixes/package-boundary-cleanup.md
 */
export {
  createPendingCheckoutOrder,
  fulfillOrderAfterLemonSqueezyPayment,
  attachLemonSqueezyCheckoutToPayment,
  processLemonSqueezyOrderWebhook,
} from "./queries/checkout";
export { createOrder } from "./queries/orders-create";
export { updateOrderStatusStaff, createStaffShipment } from "./queries/order-fulfillment";
export type { StaffShipmentInput } from "./queries/order-fulfillment";
export { upsertShipmentFromAftershipPayload } from "./queries/aftership-webhook";
export { releaseExpiredReservations, sumActiveReservedQtyByVariant } from "./queries/reservations";
