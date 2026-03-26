import { logAdminApiEvent } from "@/lib/admin-api-log";
import { getCorrelationId } from "@/lib/request-correlation";
import { requireStaffSession } from "@/lib/requireStaffSession";
import {
  fetchMedusaOrderJson,
  patchMedusaOrderMetadata,
} from "@/lib/medusa-order-bridge";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return tagResponse(staff.response, correlationId);
  }

  logAdminApiEvent({
    route: "PATCH /api/medusa/orders/[orderId]",
    correlationId,
    phase: "start",
  });

  const { orderId } = await ctx.params;
  if (!orderId?.startsWith("order_")) {
    return correlatedJson(
      correlationId,
      { error: "Invalid order id" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!status) {
    return correlatedJson(correlationId, { error: "Missing status" }, { status: 400 });
  }

  const order = await fetchMedusaOrderJson(orderId);
  if (!order) {
    return correlatedJson(correlationId, { error: "Order not found" }, { status: 404 });
  }

  const prev = (order.metadata as Record<string, unknown> | undefined) ?? {};
  const meta = { ...prev, oms_status: status };
  const result = await patchMedusaOrderMetadata(orderId, meta);
  if (!result.ok) {
    logAdminApiEvent({
      route: "PATCH /api/medusa/orders/[orderId]",
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
    route: "PATCH /api/medusa/orders/[orderId]",
    correlationId,
    phase: "ok",
    detail: { orderId, status },
  });

  return correlatedJson(correlationId, { status });
}
