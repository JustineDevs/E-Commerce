/**
 * Order read / metadata operations. Infrastructure: Medusa Admin API via bridges.
 */
import type { AdminOperationResult } from "@/lib/admin-operation-result";
import { adminErr, adminOk } from "@/lib/admin-operation-result";
import {
  fetchMedusaOrderDetailForAdmin,
  fetchMedusaOrdersForAdmin,
  patchMedusaOrderMetadata,
  type MedusaAdminOrderDetail,
  type MedusaOrderRow,
  type MedusaShipmentRow,
} from "@/lib/medusa-order-bridge";

export type OrderOperations = {
  listOrders(
    _limit: number,
    _offset: number,
  ): Promise<
    AdminOperationResult<{
      orders: MedusaOrderRow[];
      total: number;
      commerceUnavailable?: boolean;
    }>
  >;
  getOrderDetail(_orderId: string): Promise<
    AdminOperationResult<{
      order: MedusaAdminOrderDetail;
      shipments: MedusaShipmentRow[];
    }>
  >;
  patchOrderMetadata(
    _orderId: string,
    _metadata: Record<string, unknown>,
  ): Promise<AdminOperationResult<{ ok: true }>>;
};

export function createMedusaOrderOperations(): OrderOperations {
  return {
    async listOrders(limit, offset) {
      try {
        const r = await fetchMedusaOrdersForAdmin(limit, offset);
        return adminOk({
          orders: r.orders,
          total: r.total,
          commerceUnavailable: r.commerceUnavailable,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return adminErr("ORDERS_LIST", msg, 502);
      }
    },
    async getOrderDetail(orderId) {
      try {
        const r = await fetchMedusaOrderDetailForAdmin(orderId);
        if (!r) {
          return adminErr("NOT_FOUND", "Order not found", 404);
        }
        return adminOk(r);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return adminErr("ORDER_DETAIL", msg, 502);
      }
    },
    async patchOrderMetadata(orderId, metadata) {
      const r = await patchMedusaOrderMetadata(orderId, metadata);
      if (!r.ok) {
        return adminErr("ORDER_METADATA", r.error ?? "Unable to update order metadata", 502);
      }
      return adminOk({ ok: true as const });
    },
  };
}
