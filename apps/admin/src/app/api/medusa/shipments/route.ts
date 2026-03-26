import { randomUUID } from "node:crypto";
import { logAdminApiEvent } from "@/lib/admin-api-log";
import { getCorrelationId } from "@/lib/request-correlation";
import { requireStaffSession } from "@/lib/requireStaffSession";
import {
  fetchMedusaOrderJson,
  patchMedusaOrderMetadata,
} from "@/lib/medusa-order-bridge";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return tagResponse(staff.response, correlationId);
  }

  logAdminApiEvent({
    route: "POST /api/medusa/shipments",
    correlationId,
    phase: "start",
  });

  const body = (await req.json().catch(() => ({}))) as {
    orderId?: string;
    trackingNumber?: string;
    carrierSlug?: string;
    labelUrl?: string;
  };

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId.startsWith("order_")) {
    return correlatedJson(
      correlationId,
      { error: "Invalid order id" },
      { status: 400 },
    );
  }

  const trackingNumber =
    typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";
  if (!trackingNumber) {
    return correlatedJson(
      correlationId,
      { error: "Missing trackingNumber" },
      { status: 400 },
    );
  }

  const carrierSlug =
    typeof body.carrierSlug === "string" && body.carrierSlug.trim()
      ? body.carrierSlug.trim()
      : "jtexpress-ph";
  const labelUrl =
    typeof body.labelUrl === "string" && body.labelUrl.trim()
      ? body.labelUrl.trim()
      : undefined;

  const order = await fetchMedusaOrderJson(orderId);
  if (!order) {
    return correlatedJson(correlationId, { error: "Order not found" }, { status: 404 });
  }

  const prev = (order.metadata as Record<string, unknown> | undefined) ?? {};
  const list = Array.isArray(prev.fulfillment_shipments)
    ? [...(prev.fulfillment_shipments as unknown[])]
    : [];

  list.push({
    id: randomUUID(),
    tracking_number: trackingNumber,
    carrier_slug: carrierSlug,
    label_url: labelUrl ?? null,
    shipped_at: new Date().toISOString(),
    status: "pending",
  });

  const meta = {
    ...prev,
    fulfillment_shipments: list,
  };

  const result = await patchMedusaOrderMetadata(orderId, meta);
  if (!result.ok) {
    logAdminApiEvent({
      route: "POST /api/medusa/shipments",
      correlationId,
      phase: "error",
      detail: { orderId, error: result.error },
    });
    return correlatedJson(
      correlationId,
      { error: result.error ?? "Unable to update order" },
      { status: 502 },
    );
  }

  logAdminApiEvent({
    route: "POST /api/medusa/shipments",
    correlationId,
    phase: "ok",
    detail: { orderId },
  });

  return correlatedJson(correlationId, { ok: true });
}
