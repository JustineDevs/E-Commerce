import { NextResponse } from "next/server";

import {
  PAYMENT_PROVIDER_IDS,
  type PaymentProviderKey,
} from "@/lib/medusa-checkout";
import { medusaAdminFetch } from "@/lib/medusa-admin-fetch";
import { getMedusaRegionId } from "@/lib/storefront-medusa-env";

export const dynamic = "force-dynamic";

const PROVIDER_ID_TO_KEY = Object.fromEntries(
  Object.entries(PAYMENT_PROVIDER_IDS).map(([k, v]) => [v, k]),
) as Record<string, PaymentProviderKey>;

/**
 * Lists checkout payment keys enabled on the configured Medusa region.
 * Requires `MEDUSA_SECRET_API_KEY` (storefront server) so the Admin API can be called.
 */
export async function GET() {
  const regionId = getMedusaRegionId()?.trim();
  if (!regionId) {
    return NextResponse.json(
      {
        ok: false,
        keys: [] as PaymentProviderKey[],
        error: "missing_region",
        message: "Set NEXT_PUBLIC_MEDUSA_REGION_ID (and MEDUSA_REGION_ID if you use it server-side).",
      },
      { status: 200 },
    );
  }

  try {
    const res = await medusaAdminFetch(
      `/admin/regions/${encodeURIComponent(regionId)}?fields=id,*payment_providers`,
    );
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        {
          ok: false,
          keys: [] as PaymentProviderKey[],
          error: `admin_${res.status}`,
          message: t.slice(0, 240),
        },
        { status: 200 },
      );
    }

    const j = (await res.json()) as {
      region?: { payment_providers?: Array<{ id?: string } | null> };
    };

    const keys: PaymentProviderKey[] = [];
    for (const p of j.region?.payment_providers ?? []) {
      if (!p?.id) continue;
      const key = PROVIDER_ID_TO_KEY[p.id];
      if (key) keys.push(key);
    }

    return NextResponse.json({
      ok: true,
      keys,
      error: null as string | null,
      message: null as string | null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        keys: [] as PaymentProviderKey[],
        error: "fetch_failed",
        message: msg.includes("MEDUSA_SECRET_API_KEY")
          ? "Set MEDUSA_SECRET_API_KEY on the storefront so checkout can read region payment providers."
          : msg.slice(0, 240),
      },
      { status: 200 },
    );
  }
}
