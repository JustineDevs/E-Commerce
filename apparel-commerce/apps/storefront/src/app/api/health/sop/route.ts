import { NextResponse } from "next/server";
import { listMissingMedusaStorefrontEnv } from "@/lib/medusa-sop-env";
import { getMedusaStoreBaseUrl } from "@/lib/storefront-medusa-env";

export const dynamic = "force-dynamic";

/**
 * SOP-6: quick JSON probe for storefront + Medusa reachability (no secrets in response).
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  const missingEnv = listMissingMedusaStorefrontEnv();
  const baseUrl = getMedusaStoreBaseUrl();
  let medusaReachable = false;
  try {
    const res = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    medusaReachable = res.ok;
  } catch {
    medusaReachable = false;
  }

  const degraded = missingEnv.length > 0 || !medusaReachable;

  return NextResponse.json(
    {
      status: degraded ? "degraded" : "ok",
      commerceSource: "medusa",
      medusa: {
        baseUrl,
        healthReachable: medusaReachable,
      },
      missingEnv,
      timestamp,
    },
    { status: degraded ? 503 : 200 },
  );
}
