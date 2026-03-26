import { fetchMedusaPaymentProvidersFromRegions } from "@/lib/payment-providers-bridge";
import { logAdminApiEvent } from "@/lib/admin-api-log";
import { getCorrelationId } from "@/lib/request-correlation";
import { requireStaffSession } from "@/lib/requireStaffSession";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return tagResponse(staff.response, correlationId);
  }

  const providers = await fetchMedusaPaymentProvidersFromRegions();

  logAdminApiEvent({
    route: "GET /api/admin/medusa/payment-providers",
    correlationId,
    phase: "ok",
    detail: { count: providers.length },
  });

  return correlatedJson(correlationId, {
    providers,
    installmentNote:
      "Installment and BNPL depend on your payment provider module (for example Stripe, PayMongo) and region configuration in Admin.",
  });
}
