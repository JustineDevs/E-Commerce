import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import { upsertCmsAbExperiment } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const cid = getCorrelationId(req);
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffHasPermission(session.user.permissions ?? [], "content:write")) {
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
  const data = await upsertCmsAbExperiment(sup.client, {
    ...(body as object),
    id,
  } as Parameters<typeof upsertCmsAbExperiment>[1]);
  if (!data) return correlatedJson(cid, { error: "Unable to save" }, { status: 500 });
  return correlatedJson(cid, { data });
}
