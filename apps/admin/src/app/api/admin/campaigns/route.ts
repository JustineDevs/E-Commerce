import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import {
  listCampaigns,
  createCampaign,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffHasPermission(session.user.permissions ?? [], "campaigns:read")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const type = req.nextUrl.searchParams.get("type") ?? undefined;
  const data = await listCampaigns(sb, { type: type as "winback" | "birthday" | undefined });
  return correlatedJson(cid, { data });
}

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffHasPermission(session.user.permissions ?? [], "campaigns:write")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.type) {
    return correlatedJson(cid, { error: "name and type are required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const campaign = await createCampaign(sb, body);
  return correlatedJson(cid, { data: campaign }, { status: 201 });
}
