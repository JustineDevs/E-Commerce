import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  getCmsNavigationDraftPayload,
  getCmsNavigationPayloadAdmin,
  mergeNavigationDraftOverLive,
  normalizeNavigationPayloadInput,
  upsertCmsNavigationDraftPayload,
  upsertCmsNavigationPayload,
} from "@apparel-commerce/platform-data";
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
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const live = await getCmsNavigationPayloadAdmin(sup.client);
  const draft = await getCmsNavigationDraftPayload(sup.client);
  const merged = mergeNavigationDraftOverLive(live, draft);
  return correlatedJson(cid, {
    data: merged,
    meta: { hasDraft: draft != null },
  });
}

export async function PUT(req: NextRequest) {
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
  const rec = body as Record<string, unknown>;
  try {
    if (rec.mode === "draft") {
      const payload = normalizeNavigationPayloadInput(rec.payload ?? rec);
      await upsertCmsNavigationDraftPayload(sup.client, payload);
    } else {
      const payload = normalizeNavigationPayloadInput(body);
      await upsertCmsNavigationPayload(sup.client, payload);
      await upsertCmsNavigationDraftPayload(sup.client, {});
    }
  } catch (e) {
    return correlatedJson(
      cid,
      { error: e instanceof Error ? e.message : "Unable to save" },
      { status: 500 },
    );
  }
  const live = await getCmsNavigationPayloadAdmin(sup.client);
  const draft = await getCmsNavigationDraftPayload(sup.client);
  const merged = mergeNavigationDraftOverLive(live, draft);
  return correlatedJson(cid, {
    data: merged,
    meta: { hasDraft: draft != null },
  });
}
