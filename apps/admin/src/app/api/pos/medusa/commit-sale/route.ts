import { logAdminApiEvent } from "@/lib/admin-api-log";
import { getCorrelationId } from "@/lib/request-correlation";
import {
  getMedusaAdminSdk,
  getMedusaRegionId,
  getMedusaSalesChannelId,
} from "@/lib/medusa-pos";
import { requireStaffSession } from "@/lib/requireStaffSession";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffSession();
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
    return correlatedJson(
      correlationId,
      {
        error:
          "POS environment incomplete (MEDUSA_SECRET_API_KEY, MEDUSA_REGION_ID, MEDUSA_SALES_CHANNEL_ID)",
      },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    items?: Array<{ variantId: string; quantity: number }>;
    email?: string;
  };
  const items = body.items ?? [];
  if (items.length === 0) {
    return correlatedJson(correlationId, { error: "No items" }, { status: 400 });
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
    });

    if (!draft_order?.id) {
      return correlatedJson(
        correlationId,
        { error: "Draft order missing id from the store API" },
        { status: 502 },
      );
    }

    const { order } = await adminSdk.admin.draftOrder.convertToOrder(
      draft_order.id,
    );

    const orderNumber =
      order?.display_id != null ? String(order.display_id) : order?.id ?? "";

    logAdminApiEvent({
      route: "POST /api/pos/medusa/commit-sale",
      correlationId,
      phase: "ok",
      detail: { orderNumber },
    });

    return correlatedJson(correlationId, { orderNumber });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Unable to complete POS sale";
    logAdminApiEvent({
      route: "POST /api/pos/medusa/commit-sale",
      correlationId,
      phase: "error",
      detail: { message: msg },
    });
    return correlatedJson(correlationId, { error: msg }, { status: 502 });
  }
}
