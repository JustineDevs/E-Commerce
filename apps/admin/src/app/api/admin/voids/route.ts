import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  recordVoid,
  listVoids,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "pos:void")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const shiftId = req.nextUrl.searchParams.get("shift_id") ?? undefined;
  const data = await listVoids(sb, { shiftId });
  return correlatedJson(cid, { data });
}

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "pos:void")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.employee_id || !body.action) {
    return correlatedJson(cid, { error: "employee_id and action are required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const v = await recordVoid(sb, body);
  return correlatedJson(cid, { data: v }, { status: 201 });
}
