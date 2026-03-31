import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { listCmsCategoryContent } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { listAdminProductCategories } from "@/lib/medusa-product-categories";
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
  const locale = req.nextUrl.searchParams.get("locale")?.trim() || "en";
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const [cmsRows, categories] = await Promise.all([
    listCmsCategoryContent(sup.client),
    listAdminProductCategories(),
  ]);
  const cmsHandles = new Set(
    cmsRows.filter((r) => r.locale === locale).map((r) => r.collection_handle.trim().toLowerCase()),
  );
  const missing = categories.filter((c) => !cmsHandles.has(c.handle.trim().toLowerCase()));
  return correlatedJson(cid, {
    data: {
      locale,
      catalog_count: categories.length,
      cms_rows_for_locale: cmsRows.filter((r) => r.locale === locale).length,
      missing,
    },
  });
}
