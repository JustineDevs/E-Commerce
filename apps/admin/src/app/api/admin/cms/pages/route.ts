import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { listCmsPages, upsertCmsPage } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "content:read")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const locale = req.nextUrl.searchParams.get("locale") ?? undefined;
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const data = await listCmsPages(sup.client, { locale });
  return correlatedJson(cid, { data });
}

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "content:write")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return correlatedJson(cid, { error: "Invalid JSON" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const merged = await upsertCmsPage(sup.client, body as Parameters<typeof upsertCmsPage>[1]);
  if (!merged) {
    return correlatedJson(cid, { error: "Unable to save" }, { status: 500 });
  }
  return correlatedJson(cid, { data: merged });
}
