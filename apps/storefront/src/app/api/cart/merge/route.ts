import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";

import { authOptions } from "@/lib/auth";
import { MEDUSA_CART_COOKIE } from "@/lib/cart-cookie";
import type { CartLine } from "@/lib/cart";
import { medusaAdminFetch } from "@/lib/medusa-admin-fetch";
import { medusaCartToCartLines } from "@/lib/medusa-cart-to-lines";
import { createStorefrontMedusaSdk } from "@/lib/medusa-sdk";
import { getMedusaRegionId } from "@/lib/storefront-medusa-env";
import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";
import { logsnagPublish } from "@/lib/logsnag";

type GuestLine = {
  variantId?: string;
  quantity?: number;
};

async function findOrCreateCustomerId(email: string): Promise<string | null> {
  let listRes = await medusaAdminFetch(
    `/admin/customers?q=${encodeURIComponent(email)}`,
  );
  if (!listRes.ok) {
    listRes = await medusaAdminFetch(
      `/admin/customers?email=${encodeURIComponent(email)}`,
    );
  }
  if (!listRes.ok) return null;
  const listJson = (await listRes.json()) as {
    customers?: Array<{ id: string }>;
  };
  let id = listJson.customers?.[0]?.id;
  if (!id) {
    const createRes = await medusaAdminFetch("/admin/customers", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!createRes.ok) return null;
    const created = (await createRes.json()) as { customer?: { id: string } };
    id = created.customer?.id;
  }
  return id ?? null;
}

/**
 * Merges guest session lines into the customer's Medusa cart (combine quantities per variant).
 */
export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimitFixedWindow(`cart-merge:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { guestLines?: GuestLine[] };
  try {
    body = (await req.json()) as { guestLines?: GuestLine[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = Array.isArray(body.guestLines) ? body.guestLines : [];
  const guestLines: GuestLine[] = raw.filter(
    (l) =>
      l &&
      typeof l.variantId === "string" &&
      l.variantId.length > 0 &&
      typeof l.quantity === "number" &&
      Number.isFinite(l.quantity) &&
      l.quantity > 0,
  );
  if (guestLines.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, lines: [] as CartLine[] });
  }

  const regionId = getMedusaRegionId()?.trim();
  if (!regionId) {
    return NextResponse.json({ error: "Store region not configured" }, { status: 503 });
  }

  const customerId = await findOrCreateCustomerId(email);
  if (!customerId) {
    return NextResponse.json({ error: "Customer unavailable" }, { status: 502 });
  }

  let listRes = await medusaAdminFetch(
    `/admin/carts?customer_id=${encodeURIComponent(customerId)}&limit=20&order=-created_at`,
  );
  if (!listRes.ok) {
    listRes = await medusaAdminFetch(`/admin/carts?limit=50&order=-created_at`);
  }

  let targetCartId: string | null = null;
  if (listRes.ok) {
    const listJson = (await listRes.json()) as {
      carts?: Array<{ id: string; completed_at?: string | null; customer_id?: string | null }>;
    };
    const carts = listJson.carts ?? [];
    const open = carts.find(
      (c) =>
        c.customer_id === customerId &&
        (c.completed_at == null || c.completed_at === ""),
    );
    targetCartId = open?.id ?? null;
  }

  if (!targetCartId) {
    const createRes = await medusaAdminFetch("/admin/carts", {
      method: "POST",
      body: JSON.stringify({
        region_id: regionId,
        customer_id: customerId,
      }),
    });
    if (!createRes.ok) {
      const t = await createRes.text().catch(() => "");
      return NextResponse.json(
        { error: "Could not create cart", detail: t.slice(0, 200) },
        { status: 502 },
      );
    }
    const created = (await createRes.json()) as { cart?: { id: string } };
    targetCartId = created.cart?.id ?? null;
  }

  if (!targetCartId?.startsWith("cart_")) {
    return NextResponse.json({ error: "No target cart" }, { status: 500 });
  }

  const sdk = createStorefrontMedusaSdk();
  const { cart: existing } = await sdk.store.cart.retrieve(targetCartId, {
    fields: "*items,*items.id,*items.variant_id,*items.quantity",
  } as never);
  const existingRec = existing as unknown as {
    items?: Array<{ id?: string; variant_id?: string; quantity?: number }>;
  };
  const byVariant = new Map<string, number>();
  for (const it of existingRec.items ?? []) {
    const vid = typeof it.variant_id === "string" ? it.variant_id : "";
    const q =
      typeof it.quantity === "number" && Number.isFinite(it.quantity)
        ? Math.max(0, Math.floor(it.quantity))
        : 0;
    if (vid && q > 0) {
      byVariant.set(vid, (byVariant.get(vid) ?? 0) + q);
    }
  }

  for (const gl of guestLines) {
    const vid = gl.variantId as string;
    const q = Math.max(1, Math.floor(Number(gl.quantity)));
    byVariant.set(vid, (byVariant.get(vid) ?? 0) + q);
  }

  for (const it of existingRec.items ?? []) {
    const lineId = typeof it.id === "string" ? it.id : "";
    if (!lineId) continue;
    const delRes = await medusaAdminFetch(
      `/admin/carts/${encodeURIComponent(targetCartId)}/line-items/${encodeURIComponent(lineId)}`,
      { method: "DELETE" },
    );
    if (!delRes.ok && delRes.status !== 404) {
      const t = await delRes.text().catch(() => "");
      return NextResponse.json(
        { error: "Could not clear cart lines", detail: t.slice(0, 200) },
        { status: 502 },
      );
    }
  }

  for (const [variantId, quantity] of byVariant) {
    const addRes = await medusaAdminFetch(
      `/admin/carts/${encodeURIComponent(targetCartId)}/line-items`,
      {
        method: "POST",
        body: JSON.stringify({ variant_id: variantId, quantity }),
      },
    );
    if (!addRes.ok) {
      const t = await addRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Could not add line to cart",
          detail: t.slice(0, 200),
          variantId,
        },
        { status: 502 },
      );
    }
  }

  const { cart: finalCart } = await sdk.store.cart.retrieve(targetCartId, {
    fields:
      "*items,*items.unit_price,*items.quantity,*items.variant,*items.variant.product,*items.variant.options,*items.product",
  } as never);
  const lines = medusaCartToCartLines(finalCart);

  const jar = await cookies();
  jar.set(MEDUSA_CART_COOKIE, targetCartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  void logsnagPublish({
    channel: "commerce",
    event: "cart_merge",
    description: `Merged guest cart into ${targetCartId}`,
    tags: { email },
  });

  return NextResponse.json({ ok: true, cartId: targetCartId, lines });
}
