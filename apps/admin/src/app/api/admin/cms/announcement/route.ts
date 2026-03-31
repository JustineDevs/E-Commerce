import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  deleteCmsAnnouncement,
  getCmsAnnouncementAnalyticsMap,
  listCmsAnnouncementsAdmin,
  upsertCmsAnnouncement,
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
  const [rows, analyticsMap] = await Promise.all([
    listCmsAnnouncementsAdmin(sup.client),
    getCmsAnnouncementAnalyticsMap(sup.client),
  ]);
  const analytics: Record<string, { impressions: number; clicks: number; dismisses: number }> = {};
  for (const [k, v] of analyticsMap) {
    analytics[k] = {
      impressions: v.impressions,
      clicks: v.clicks,
      dismisses: v.dismisses,
    };
  }
  return correlatedJson(cid, { data: { rows, analytics } });
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
  try {
    await upsertCmsAnnouncement(sup.client, body as Parameters<typeof upsertCmsAnnouncement>[1]);
  } catch (e) {
    return correlatedJson(
      cid,
      { error: e instanceof Error ? e.message : "Unable to save" },
      { status: 500 },
    );
  }
  const rows = await listCmsAnnouncementsAdmin(sup.client);
  const analyticsMap = await getCmsAnnouncementAnalyticsMap(sup.client);
  const analytics: Record<string, { impressions: number; clicks: number; dismisses: number }> = {};
  for (const [k, v] of analyticsMap) {
    analytics[k] = {
      impressions: v.impressions,
      clicks: v.clicks,
      dismisses: v.dismisses,
    };
  }
  return correlatedJson(cid, { data: { rows, analytics } });
}

export async function DELETE(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "content:write")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id")?.trim();
  const locale = req.nextUrl.searchParams.get("locale")?.trim() || "en";
  if (!id) {
    return correlatedJson(cid, { error: "Missing id" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const ok = await deleteCmsAnnouncement(sup.client, id, locale);
  if (!ok) return correlatedJson(cid, { error: "Unable to delete" }, { status: 500 });
  return correlatedJson(cid, { ok: true });
}
