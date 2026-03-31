import { NextRequest } from "next/server";
import { requirePinApproval } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { getCorrelationId } from "@/lib/request-correlation";
import { requireStaffSessionWithPermission } from "@/lib/requireStaffSession";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const staff = await requireStaffSessionWithPermission("pos:use");
  if (!staff.ok) {
    return tagResponse(staff.response, cid);
  }

  const { approver_employee_id, pin, required_role } = await req.json();
  if (!approver_employee_id || !pin) {
    return correlatedJson(cid, { error: "approver_employee_id and pin required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const result = await requirePinApproval(
    sb,
    approver_employee_id,
    pin,
    required_role ?? "manager",
  );
  return correlatedJson(cid, result);
}
