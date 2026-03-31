import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { authOptions } from "@/lib/auth";
import { searchCatalogVariantLines } from "@/lib/chat-order-catalog-search";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(correlationId, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "chat_orders:manage")) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const lines = await searchCatalogVariantLines(q, 12);
  return correlatedJson(correlationId, { lines });
}
