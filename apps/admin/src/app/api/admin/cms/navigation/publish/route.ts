import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  getCmsNavigationPayloadAdmin,
  publishCmsNavigationDraft,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  const canPublish =
    staffSessionAllows(session, "content:publish") ||
    staffSessionAllows(session, "content:write");
  if (!canPublish) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  try {
    await publishCmsNavigationDraft(sup.client);
  } catch (e) {
    return correlatedJson(
      cid,
      { error: e instanceof Error ? e.message : "Unable to publish" },
      { status: 500 },
    );
  }
  const data = await getCmsNavigationPayloadAdmin(sup.client);
  return correlatedJson(cid, { data, meta: { hasDraft: false } });
}
