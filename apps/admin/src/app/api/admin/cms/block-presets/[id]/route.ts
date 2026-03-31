import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { deleteCmsPageBlockPreset } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const cid = getCorrelationId(_req);
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "content:write")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const ok = await deleteCmsPageBlockPreset(sup.client, id);
  if (!ok) {
    return correlatedJson(cid, { error: "Unable to delete" }, { status: 500 });
  }
  return correlatedJson(cid, { ok: true });
}
