import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { requirePinApproval } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });

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
