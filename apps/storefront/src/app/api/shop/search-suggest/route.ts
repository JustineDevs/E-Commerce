import { NextResponse } from "next/server";
import { createStorefrontMedusaSdk } from "@/lib/medusa-sdk";
import { mapMedusaProductToProduct, minVariantPrice } from "@/lib/medusa-catalog-mapper";
import { getMedusaRegionId } from "@/lib/storefront-medusa-env";
import { getMedusaPublishableKey } from "@/lib/storefront-medusa-env";
import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";

const FIELDS =
  "*variants,*variants.calculated_price,*variants.options,*variants.barcode,*categories,*options,+thumbnail,*images,+metadata,+created_at";

export async function GET(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimitFixedWindow(`search-suggest:${ip}`, 90, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { suggestions: [], error: "rate_limited", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }
  if (!getMedusaPublishableKey()?.trim() || !getMedusaRegionId()?.trim()) {
    return NextResponse.json({ suggestions: [] });
  }
  try {
    const sdk = createStorefrontMedusaSdk();
    const regionId = getMedusaRegionId()!;
    const { products } = await sdk.store.product.list({
      region_id: regionId,
      q,
      limit: 8,
      fields: FIELDS,
    });
    const suggestions = (products ?? []).map((raw) => {
      const p = mapMedusaProductToProduct(raw as never);
      return {
        slug: p.slug,
        name: p.name,
        minPrice: minVariantPrice(p),
      };
    });
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
