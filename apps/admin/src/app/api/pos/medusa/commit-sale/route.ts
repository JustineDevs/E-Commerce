import { evaluatePosSalePolicy } from "@apparel-commerce/omnichannel-policy";
import { getShiftById } from "@apparel-commerce/platform-data";
import { logAdminApiEvent } from "@/lib/admin-api-log";
import { medusaAdminFetch } from "@/lib/medusa-admin-http";
import { patchMedusaOrderMetadata } from "@/lib/medusa-order-bridge";
import {
  getCompletedPosCommitOrderNumber,
  rememberCompletedPosCommit,
} from "@/lib/pos-commit-idempotency";
import { handlePosCommitSaleRequest } from "@/lib/pos-commit-sale-route-handler";
import { assertPosCartStock } from "@/lib/pos-inventory-guard";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { getCorrelationId } from "@/lib/request-correlation";
import {
  getMedusaAdminSdk,
  getMedusaRegionId,
  getMedusaSalesChannelId,
} from "@/lib/medusa-pos";
import { posCommitSaleRouteLogic } from "@/lib/pos-commit-sale-route-logic";
import { requireStaffApiSession } from "@/lib/requireStaffSession";

const inflight = new Map<string, number>();
const INFLIGHT_TTL_MS = 30_000;
const INFLIGHT_MAX = 5_000;

function pruneInflight(): void {
  if (inflight.size < INFLIGHT_MAX) return;
  const now = Date.now();
  for (const [k, ts] of inflight) {
    if (now - ts > INFLIGHT_TTL_MS) inflight.delete(k);
  }
}

async function findOrderByPosOfflineId(
  offlineSaleId: string,
): Promise<{ display_id: unknown; id: string } | null> {
  const pageSize = 50;
  for (let offset = 0; offset < 200; offset += pageSize) {
    const qs = new URLSearchParams();
    qs.set("limit", String(pageSize));
    qs.set("offset", String(offset));
    qs.set("fields", "id,display_id,metadata");
    qs.set("order", "-created_at");
    const res = await medusaAdminFetch(`/admin/orders?${qs.toString()}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      orders?: Array<{
        id?: string;
        display_id?: unknown;
        metadata?: Record<string, unknown> | null;
      }>;
    };
    const orders = json.orders ?? [];
    for (const o of orders) {
      if (o.metadata?.pos_offline_id === offlineSaleId && o.id) {
        return { id: o.id, display_id: o.display_id };
      }
    }
    if (orders.length < pageSize) break;
  }
  return null;
}

export async function POST(req: Request) {
  const adminSdk = getMedusaAdminSdk();
  const regionId = getMedusaRegionId();
  const salesChannelId = getMedusaSalesChannelId();
  return handlePosCommitSaleRequest(req, {
    getCorrelationId,
    requireStaffApiSession,
    logAdminApiEvent,
    getIdempotencyKey: (request) => request.headers.get("idempotency-key") ?? undefined,
    getCompletedReplayOrderNumber: (key) => getCompletedPosCommitOrderNumber(key) ?? undefined,
    isInflight: (key) => {
      pruneInflight();
      return inflight.has(key);
    },
    startInflight: (key) => {
      inflight.set(key, Date.now());
    },
    clearInflight: (key) => {
      inflight.delete(key);
    },
    executeCommitSale: async ({ body, correlationId, idempotencyKey }) => {
      try {
        return await posCommitSaleRouteLogic({
          body,
          correlationId,
          idempotencyKey,
          envReady: Boolean(adminSdk && regionId && salesChannelId),
          completedReplayOrderNumber: null,
          findExistingOrderByOfflineSaleId: async (offlineSaleId) => {
            const existing = await findOrderByPosOfflineId(offlineSaleId);
            if (!existing) {
              return null;
            }
            return {
              id: existing.id,
              displayId:
                existing.display_id != null ? String(existing.display_id) : existing.id,
            };
          },
          assertStock: async (items) => assertPosCartStock(items),
          loadShiftStatus: async (shiftId) => {
            const sup = adminSupabaseOr503(correlationId);
            if ("response" in sup) {
              throw new Error("SUPABASE_UNAVAILABLE");
            }
            const row = await getShiftById(sup.client, shiftId);
            return row?.status === "open" ? "open" : row ? "closed" : "missing";
          },
          evaluatePolicy: (policyInput) => evaluatePosSalePolicy(policyInput),
          createDraftOrder: async (draftInput) => {
            if (!adminSdk || !regionId || !salesChannelId) {
              return {};
            }
            const { draft_order } = await adminSdk.admin.draftOrder.create({
              email: draftInput.email,
              region_id: regionId,
              sales_channel_id: salesChannelId,
              items: draftInput.items,
              ...(draftInput.metadata ? { metadata: draftInput.metadata } : {}),
            } as never);
            return { id: draft_order?.id };
          },
          convertDraftToOrder: async (draftOrderId) => {
            if (!adminSdk) {
              return {};
            }
            const { order } = await adminSdk.admin.draftOrder.convertToOrder(draftOrderId);
            const total = (order as { total?: unknown } | undefined)?.total;
            return {
              id: order?.id != null ? String(order.id) : undefined,
              display_id: order?.display_id,
              total: typeof total === "number" ? total : undefined,
            };
          },
          patchOrderMetadata: async (orderId, metadata) => {
            await patchMedusaOrderMetadata(orderId, metadata);
          },
          rememberCompletedReplay: (key, orderNumber) => {
            rememberCompletedPosCommit(key, orderNumber);
          },
        });
      } catch (e) {
        const msg =
          e instanceof Error && e.message === "SUPABASE_UNAVAILABLE"
            ? "Supabase admin connection is not configured"
            : e instanceof Error
              ? e.message
              : "Unable to complete POS sale";
        return {
          status:
            msg === "Supabase admin connection is not configured" ? 503 : 502,
          body: {
            error: msg,
            code:
              msg === "Supabase admin connection is not configured"
                ? "SUPABASE_NOT_CONFIGURED"
                : "INTERNAL_ERROR",
          },
          logPhase: "error" as const,
          logDetail: { message: msg },
        };
      }
    },
  });
}
