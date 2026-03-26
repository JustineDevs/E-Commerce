import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import { updateDevice } from "@apparel-commerce/platform-data";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffHasPermission(session.user.permissions ?? [], "devices:manage")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return correlatedJson(cid, { error: "Missing id" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    ip_address?: string | null;
    config?: Record<string, unknown>;
    is_active?: boolean;
  };
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const patch: {
    ip_address?: string | null;
    config?: Record<string, unknown>;
    is_active?: boolean;
  } = {};
  if (body.ip_address !== undefined) patch.ip_address = body.ip_address;
  if (body.config !== undefined) patch.config = body.config;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  const device = await updateDevice(sup.client, id, patch);
  return correlatedJson(cid, { data: device });
}
