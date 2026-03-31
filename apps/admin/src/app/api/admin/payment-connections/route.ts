import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { logAdminApiEvent } from "@/lib/admin-api-log";
import { safePaymentConnectionClientError } from "@/lib/payment-connection-api-errors";
import { requireStaffApiSession } from "@/lib/requireStaffSession";
import {
  createPaymentConnection,
  listPaymentConnections,
  paymentWebhookUrl,
} from "@/lib/payment-connections";

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffApiSession("settings:read");
  if (!staff.ok) return tagResponse(staff.response, correlationId);

  const sup = adminSupabaseOr503(correlationId);
  if ("response" in sup) return sup.response;

  const items = await listPaymentConnections(sup.client);
  logAdminApiEvent({
    route: "GET /api/admin/payment-connections",
    correlationId,
    phase: "ok",
    detail: { count: items.length },
  });
  return correlatedJson(correlationId, { items });
}

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffApiSession("settings:write");
  if (!staff.ok) return tagResponse(staff.response, correlationId);

  const sup = adminSupabaseOr503(correlationId);
  if ("response" in sup) return sup.response;

  const actorEmail = staff.session.user.email?.trim() || "staff@local";
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const created = await createPaymentConnection(sup.client, {
      actorEmail,
      provider: body.provider,
      label: body.label,
      regionId: body.regionId,
      mode: body.mode,
      metadata: body.metadata,
      secrets: body.secrets,
    });
    const webhookUrl = paymentWebhookUrl(created.provider);
    return correlatedJson(
      correlationId,
      { item: created, ...(webhookUrl ? { webhookUrl } : {}) },
      { status: 201 },
    );
  } catch (error) {
    const message = safePaymentConnectionClientError(
      error instanceof Error ? error : new Error("Could not create connection."),
    );
    logAdminApiEvent({
      route: "POST /api/admin/payment-connections",
      correlationId,
      phase: "error",
      detail: { message },
    });
    return correlatedJson(correlationId, { error: message }, { status: 400 });
  }
}
