import { logAdminApiEvent } from "@/lib/admin-api-log";
import { getCorrelationId } from "@/lib/request-correlation";
import {
  getMedusaRegionId,
  getMedusaStoreSdk,
  optionRowsToSizeColor,
  variantPricePhpFromCalculated,
} from "@/lib/medusa-pos";
import { requireStaffSession } from "@/lib/requireStaffSession";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return tagResponse(staff.response, correlationId);
  }

  const regionId = getMedusaRegionId();
  const storeSdk = getMedusaStoreSdk();
  if (!regionId || !storeSdk) {
    return correlatedJson(
      correlationId,
      {
        error:
          "POS environment incomplete (NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, MEDUSA_REGION_ID)",
      },
      { status: 503 },
    );
  }

  try {
    const { products } = await storeSdk.store.product.list({
      region_id: regionId,
      limit: 12,
      fields:
        "*variants,*variants.calculated_price,*variants.options,*variants.sku,+title,+thumbnail",
    });

    const suggestions: Array<{
      variantId: string;
      name: string;
      sku: string;
      size: string;
      color: string;
      price: number;
      imageUrl?: string;
    }> = [];

    for (const p of products ?? []) {
      for (const v of p.variants ?? []) {
        if (!v?.id) continue;
        const { size, color } = optionRowsToSizeColor(
          v.options as Parameters<typeof optionRowsToSizeColor>[0],
        );
        suggestions.push({
          variantId: v.id,
          name: p.title ?? "",
          sku: String(v.sku ?? ""),
          size,
          color,
          price: variantPricePhpFromCalculated(v.calculated_price),
          imageUrl: p.thumbnail ?? undefined,
        });
        if (suggestions.length >= 8) break;
      }
      if (suggestions.length >= 8) break;
    }

    logAdminApiEvent({
      route: "GET /api/pos/medusa/suggestions",
      correlationId,
      phase: "ok",
      detail: { count: suggestions.length },
    });

    return correlatedJson(correlationId, { suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Suggestions unavailable";
    return correlatedJson(correlationId, { error: msg }, { status: 502 });
  }
}
