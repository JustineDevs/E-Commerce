import { getServerSession } from "next-auth/next";
import {
  checkStaffRole,
  staffHasPermission,
  staffPermissionListForSession,
} from "@apparel-commerce/database";
import { authOptions } from "@/lib/auth";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { auditActorCsvCell } from "@/lib/audit-actor-format";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Staff audit rows (timelines, compliance view, export).
 * JSON: `dashboard:read`. CSV export: `analytics:export`.
 */
export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  const roleCheck = checkStaffRole(session);
  if (!roleCheck.ok) {
    const status = roleCheck.status === 401 ? 401 : 403;
    return correlatedJson(
      correlationId,
      { error: status === 401 ? "Unauthorized" : "Forbidden", code: roleCheck.code },
      { status },
    );
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format")?.trim().toLowerCase() ?? "";
  const isCsv = format === "csv" || format === "text/csv";

  const perms = staffPermissionListForSession(session);
  if (isCsv) {
    if (!staffHasPermission(perms, "analytics:export")) {
      return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
    }
  } else if (!staffHasPermission(perms, "dashboard:read")) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }

  const defaultLimit = isCsv ? 500 : 20;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || defaultLimit));
  const resourcePrefix = url.searchParams.get("resource_prefix")?.trim() ?? "";
  const actionPrefix = url.searchParams.get("action_prefix")?.trim() ?? "";
  const actionExact = url.searchParams.get("action")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";

  const sup = adminSupabaseOr503(correlationId);
  if ("response" in sup) {
    return sup.response;
  }

  let q = sup.client
    .from("audit_logs")
    .select("id,action,resource,details,created_at,actor_id,users(email,name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (resourcePrefix) {
    q = q.ilike("resource", `${resourcePrefix}%`);
  }
  if (actionExact) {
    q = q.eq("action", actionExact);
  } else if (actionPrefix) {
    q = q.ilike("action", `${actionPrefix}%`);
  }
  if (from) {
    q = q.gte("created_at", from);
  }
  if (to) {
    q = q.lte("created_at", to);
  }

  const { data, error } = await q;
  if (error) {
    return correlatedJson(correlationId, { error: error.message }, { status: 502 });
  }

  const rows = data ?? [];

  if (isCsv) {
    const header = ["id", "created_at", "actor", "action", "resource", "details_json"].join(",");
    const lines = rows.map((r) => {
      const rec = r as Record<string, unknown>;
      const details =
        rec.details != null ? JSON.stringify(rec.details) : "";
      const actor = auditActorCsvCell(
        rec as {
          users?: { email?: string | null; name?: string | null } | null;
          details: Record<string, unknown> | null;
        },
      );
      return [
        escapeCsvCell(String(rec.id ?? "")),
        escapeCsvCell(String(rec.created_at ?? "")),
        escapeCsvCell(actor),
        escapeCsvCell(String(rec.action ?? "")),
        escapeCsvCell(String(rec.resource ?? "")),
        escapeCsvCell(details),
      ].join(",");
    });
    const csv = [header, ...lines].join("\r\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit_logs_${correlationId.slice(0, 8)}.csv"`,
        "x-correlation-id": correlationId,
      },
    });
  }

  return correlatedJson(correlationId, { entries: rows });
}
