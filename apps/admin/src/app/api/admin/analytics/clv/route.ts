import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { computeClv } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "analytics:read")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return correlatedJson(cid, { error: "email query param required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const clv = await computeClv(sb, email);
  if (!clv) return correlatedJson(cid, { error: "Not found" }, { status: 404 });
  return correlatedJson(cid, { data: clv });
}
