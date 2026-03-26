import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import { authOptions } from "@/lib/auth";
import { listAdminProductCategories } from "@/lib/medusa-product-categories";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(correlationId, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffHasPermission(session.user.permissions ?? [], "catalog:read")) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }

  const categories = await listAdminProductCategories();
  return correlatedJson(correlationId, { categories });
}
