import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { requireStaffApiSession } from "@/lib/requireStaffSession";
import { resolveActiveConnectionByRegion } from "@/lib/payment-connections";
import { fetchMedusaPaymentProvidersFromRegions } from "@/lib/payment-providers-bridge";

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffApiSession("settings:read");
  if (!staff.ok) return tagResponse(staff.response, correlationId);

  const url = new URL(req.url);
  const regionId = url.searchParams.get("region_id")?.trim() || "";
  if (!regionId) {
    return correlatedJson(correlationId, { error: "region_id is required." }, { status: 400 });
  }

  const sup = adminSupabaseOr503(correlationId);
  if ("response" in sup) return sup.response;

  const active = await resolveActiveConnectionByRegion(sup.client, regionId);
  const medusaRows = await fetchMedusaPaymentProvidersFromRegions();
  const medusaProviderIds = medusaRows
    .filter((row) => row.regionId === regionId)
    .map((row) => row.id);
  const medusaAcceptsActiveProvider =
    active == null ? false : medusaProviderIds.includes(active.provider);

  return correlatedJson(correlationId, {
    activeConnection: active,
    medusaProviderIds,
    medusaAcceptsActiveProvider,
  });
}
