import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  getSegmentMembers,
  addSegmentMembers,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "crm:segments")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const data = await getSegmentMembers(sb, id);
  return correlatedJson(cid, { data });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "crm:segments")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const { members } = await req.json();
  if (!Array.isArray(members) || members.length === 0) {
    return correlatedJson(cid, { error: "members array is required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const count = await addSegmentMembers(sb, id, members);
  return correlatedJson(cid, { count });
}
