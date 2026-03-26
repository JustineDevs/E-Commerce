import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import {
  listLoyaltyAccounts,
  getOrCreateLoyaltyAccount,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffHasPermission(session.user.permissions ?? [], "loyalty:read")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const tier = req.nextUrl.searchParams.get("tier") as "standard" | "silver" | "gold" | "platinum" | null;
  const data = await listLoyaltyAccounts(sb, { tier: tier ?? undefined });
  return correlatedJson(cid, { data });
}

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffHasPermission(session.user.permissions ?? [], "loyalty:write")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const { email, medusa_customer_id } = await req.json();
  if (!email) {
    return correlatedJson(cid, { error: "email is required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const account = await getOrCreateLoyaltyAccount(sb, email, medusa_customer_id);
  return correlatedJson(cid, { data: account }, { status: 201 });
}
