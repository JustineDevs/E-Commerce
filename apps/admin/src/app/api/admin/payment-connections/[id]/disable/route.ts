import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { requireStaffApiSession } from "@/lib/requireStaffSession";
import { disablePaymentConnection } from "@/lib/payment-connections";
import { safePaymentConnectionClientError } from "@/lib/payment-connection-api-errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteParams) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffApiSession("settings:write");
  if (!staff.ok) return tagResponse(staff.response, correlationId);

  const sup = adminSupabaseOr503(correlationId);
  if ("response" in sup) return sup.response;

  const actorEmail = staff.session.user.email?.trim() || "staff@local";
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return correlatedJson(correlationId, { error: "Missing connection id." }, { status: 400 });
  }
  try {
    const item = await disablePaymentConnection(sup.client, { id, actorEmail });
    return correlatedJson(correlationId, { item });
  } catch (error) {
    const message = safePaymentConnectionClientError(
      error instanceof Error ? error : new Error("Could not disable connection."),
    );
    return correlatedJson(correlationId, { error: message }, { status: 400 });
  }
}
