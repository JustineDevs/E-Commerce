import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import { closeShift } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffHasPermission(session.user.permissions ?? [], "pos:shift_manage")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json();
  if (body.closing_cash == null) {
    return correlatedJson(cid, { error: "closing_cash is required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const shift = await closeShift(sb, id, body);
  return correlatedJson(cid, { data: shift });
}
