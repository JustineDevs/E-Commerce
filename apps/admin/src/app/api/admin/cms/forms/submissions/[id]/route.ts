import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { updateCmsFormSubmission } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const cid = getCorrelationId(req);
  const { id } = await ctx.params;
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
  const b = body as {
    read_at?: string | null;
    assigned_to?: string | null;
    spam_score?: number;
  };
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const row = await updateCmsFormSubmission(sup.client, id, {
    read_at: b.read_at,
    assigned_to: b.assigned_to,
    spam_score: b.spam_score,
  });
  if (!row) return correlatedJson(cid, { error: "Not found" }, { status: 404 });
  return correlatedJson(cid, { data: row });
}
