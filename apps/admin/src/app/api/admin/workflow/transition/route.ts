import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  transitionEntityWorkflow,
  type EntityWorkflowType,
} from "@/lib/admin-workflow";
import { authOptions } from "@/lib/auth";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { getCorrelationId } from "@/lib/request-correlation";
import { jsonFromAdminOperationResult } from "@/lib/staff-api-operation";
import { insertStaffAuditLog } from "@/lib/staff-audit";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

const ENTITY_PERMS: Record<EntityWorkflowType, string> = {
  catalog_product: "catalog:write",
  sales_order: "orders:write",
  inventory_adjustment: "inventory:write",
  campaign: "campaigns:write",
  cms_page: "content:write",
};

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return correlatedJson(correlationId, { error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const entityType = body.entity_type as EntityWorkflowType | undefined;
  const entityId = typeof body.entity_id === "string" ? body.entity_id : "";
  const toState = typeof body.to_state === "string" ? body.to_state : "";
  const notes = typeof body.notes === "string" ? body.notes : null;

  if (!entityType || !entityId || !toState) {
    return correlatedJson(
      correlationId,
      { error: "entity_type, entity_id, and to_state are required" },
      { status: 400 },
    );
  }

  const perm = ENTITY_PERMS[entityType];
  if (!perm) {
    return correlatedJson(correlationId, { error: "Invalid entity_type" }, { status: 400 });
  }
  if (!staffSessionAllows(session, perm)) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }

  const sup = adminSupabaseOr503(correlationId);
  if ("response" in sup) {
    return sup.response;
  }

  const result = await transitionEntityWorkflow(sup.client, {
    entityType,
    entityId,
    toState,
    actorEmail: session.user.email,
    notes,
  });

  if (!result.ok) {
    return jsonFromAdminOperationResult(correlationId, result, 200);
  }

  await insertStaffAuditLog(sup.client, {
    actorEmail: session.user.email,
    action: "workflow.transition",
    resource: `${entityType}:${entityId}`,
    details: { to_state: toState },
  });

  return jsonFromAdminOperationResult(correlationId, result, 200);
}
