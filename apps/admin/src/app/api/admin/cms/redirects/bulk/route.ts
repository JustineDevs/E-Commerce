import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { upsertCmsRedirect } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function PATCH(req: NextRequest) {
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
  const b = body as { ids?: string[]; active?: boolean };
  const ids = Array.isArray(b.ids) ? b.ids.filter((x) => typeof x === "string") : [];
  if (!ids.length || typeof b.active !== "boolean") {
    return correlatedJson(cid, { error: "ids[] and active required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  let updated = 0;
  for (const id of ids) {
    const { data } = await sup.client.from("cms_redirects").select("*").eq("id", id).maybeSingle();
    if (!data) continue;
    const r = data as Record<string, unknown>;
    const row = await upsertCmsRedirect(sup.client, {
      id,
      from_path: String(r.from_path ?? ""),
      to_path: String(r.to_path ?? ""),
      status_code: Number(r.status_code) as 301 | 302 | 307 | 308,
      active: b.active,
      preserve_query: Boolean(r.preserve_query),
    });
    if (row) updated++;
  }
  return correlatedJson(cid, { data: { updated } });
}
