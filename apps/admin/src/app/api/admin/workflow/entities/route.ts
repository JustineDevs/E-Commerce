import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { authOptions } from "@/lib/auth";
import { listEntityWorkflows } from "@/lib/admin-workflow";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

/**
 * Lists recent `admin_entity_workflow` rows (catalog, CMS, campaigns, etc.).
 * Permission: `dashboard:read`.
 */
export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(correlationId, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "dashboard:read")) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50),
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
  const entityType = url.searchParams.get("entity_type")?.trim() || undefined;

  const sup = adminSupabaseOr503(correlationId);
  if ("response" in sup) return sup.response;

  try {
    const rows = await listEntityWorkflows(sup.client, {
      limit,
      offset,
      entityType,
    });
    return correlatedJson(correlationId, { rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Workflow list unavailable";
    return correlatedJson(correlationId, { error: message }, { status: 502 });
  }
}
