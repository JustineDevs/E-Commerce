import { logAdminApiEvent } from "@/lib/admin-api-log";
import { medusaAdminFetch } from "@/lib/medusa-admin-http";
import { patchMedusaOrderMetadata } from "@/lib/medusa-order-bridge";
import {
  getCompletedPosCommitOrderNumber,
  rememberCompletedPosCommit,
} from "@/lib/pos-commit-idempotency";
import { assertPosCartStock } from "@/lib/pos-inventory-guard";
import { getCorrelationId } from "@/lib/request-correlation";
import {
  getMedusaAdminSdk,
  getMedusaRegionId,
  getMedusaSalesChannelId,
} from "@/lib/medusa-pos";
import { requireStaffApiSession } from "@/lib/requireStaffSession";
import { correlatedJson, correlatedError, tagResponse } from "@/lib/staff-api-response";

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
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffApiSession("pos:use");
  if (!staff.ok) {
    return tagResponse(staff.response, correlationId);
  }

  logAdminApiEvent({
    route: "POST /api/pos/medusa/commit-sale",
    correlationId,
    phase: "start",
  });

  const adminSdk = getMedusaAdminSdk();
  const regionId = getMedusaRegionId();
  const salesChannelId = getMedusaSalesChannelId();
  if (!adminSdk || !regionId || !salesChannelId) {
    return correlatedError(
      correlationId,
      503,
      "POS environment incomplete (MEDUSA_SECRET_API_KEY, MEDUSA_REGION_ID, MEDUSA_SALES_CHANNEL_ID)",
      "MEDUSA_UNAVAILABLE",
    );
  }

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  if (idempotencyKey) {
    const replay = getCompletedPosCommitOrderNumber(idempotencyKey);
    if (replay) {
      logAdminApiEvent({
        route: "POST /api/pos/medusa/commit-sale",
        correlationId,
        phase: "ok",
        detail: { orderNumber: replay, idempotent: true, replay: true },
      });
      return correlatedJson(correlationId, {
        orderNumber: replay,
        idempotent: true,
      });
    }
    pruneInflight();
    if (inflight.has(idempotencyKey)) {
      return correlatedError(correlationId, 409, "Duplicate request in flight", "CONFLICT");
    }
    inflight.set(idempotencyKey, Date.now());
  }

  const body = (await req.json().catch(() => ({}))) as {
    items?: Array<{ variantId: string; quantity: number }>;
    email?: string;
    /** IndexedDB offline sale id; replays return the same Medusa order when already synced. */
    offlineSaleId?: string;
  };
  const items = body.items ?? [];
  if (items.length === 0) {
    if (idempotencyKey) inflight.delete(idempotencyKey);
    return correlatedError(correlationId, 400, "No items", "BAD_REQUEST");
  }

  const offlineSaleId =
    typeof body.offlineSaleId === "string" ? body.offlineSaleId.trim() : "";
  if (offlineSaleId) {
    const existing = await findOrderByPosOfflineId(offlineSaleId);
    if (existing) {
      const orderNumber =
        existing.display_id != null
          ? String(existing.display_id)
          : existing.id;
      logAdminApiEvent({
        route: "POST /api/pos/medusa/commit-sale",
        correlationId,
        phase: "ok",
        detail: { orderNumber, idempotent: true },
      });
      return correlatedJson(correlationId, { orderNumber, idempotent: true });
    }
  }

  const stock = await assertPosCartStock(items);
  if (!stock.ok) {
    if (idempotencyKey) inflight.delete(idempotencyKey);
    const status = stock.code === "INSUFFICIENT_STOCK" ? 409 : 502;
    return correlatedError(correlationId, status, stock.message, stock.code);
  }

  try {
    const { draft_order } = await adminSdk.admin.draftOrder.create({
      email: (body.email?.trim() || "pos@instore.local").slice(0, 320),
      region_id: regionId,
      sales_channel_id: salesChannelId,
      items: items.map((i) => ({
        variant_id: i.variantId,
        quantity: Math.max(1, Math.floor(i.quantity)),
      })),
      ...(offlineSaleId
        ? { metadata: { pos_offline_id: offlineSaleId } as Record<string, unknown> }
        : {}),
    } as never);

    if (!draft_order?.id) {
      return correlatedError(
        correlationId,
        502,
        "Draft order missing id from the store API",
        "MEDUSA_UNAVAILABLE",
      );
    }

    const { order } = await adminSdk.admin.draftOrder.convertToOrder(
      draft_order.id,
    );

    if (offlineSaleId && order?.id) {
      await patchMedusaOrderMetadata(order.id, {
        pos_offline_id: offlineSaleId,
      });
    }

    const orderNumber =
      order?.display_id != null ? String(order.display_id) : order?.id ?? "";
    const orderId = order?.id != null ? String(order.id) : "";

    if (idempotencyKey && orderNumber) {
      rememberCompletedPosCommit(idempotencyKey, orderNumber);
    }

    const orderRaw = order as unknown as Record<string, unknown> | null | undefined;
    const totalMinor = Math.round(Number(orderRaw?.total ?? 0));

    logAdminApiEvent({
      route: "POST /api/pos/medusa/commit-sale",
      correlationId,
      phase: "ok",
      detail: {
        orderNumber,
        pos_sale: {
          order_id: orderId || orderNumber,
          store_id: salesChannelId,
          total_minor: Number.isFinite(totalMinor) ? totalMinor : 0,
          payment_method: "pos_draft_converted",
        },
      },
    });

    return correlatedJson(correlationId, { orderNumber, orderId: orderId || undefined });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Unable to complete POS sale";
    logAdminApiEvent({
      route: "POST /api/pos/medusa/commit-sale",
      correlationId,
      phase: "error",
      detail: { message: msg },
    });
    return correlatedError(correlationId, 502, msg, "INTERNAL_ERROR");
  } finally {
    if (idempotencyKey) inflight.delete(idempotencyKey);
  }
}
