import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  listPendingQueue,
  enqueueOfflineSale,
  markSynced,
  markFailed,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "pos:use")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const deviceName = req.nextUrl.searchParams.get("device") ?? undefined;
  const data = await listPendingQueue(sb, { deviceName });
  return correlatedJson(cid, { data });
}

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "pos:use")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.device_name || !body.payload) {
    return correlatedJson(cid, { error: "device_name and payload are required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const item = await enqueueOfflineSale(sb, body);
  return correlatedJson(cid, { data: item }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "pos:use")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const { id, action, error_message } = await req.json();
  if (!id || !action) {
    return correlatedJson(cid, { error: "id and action required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  if (action === "synced") {
    await markSynced(sb, id);
  } else if (action === "failed") {
    await markFailed(sb, id, error_message ?? "Unknown error");
  }
  return correlatedJson(cid, { success: true });
}
