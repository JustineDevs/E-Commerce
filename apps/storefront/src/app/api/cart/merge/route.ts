import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import type { CartLine } from "@/lib/cart";
import { medusaAdminFetch } from "@/lib/medusa-admin-fetch";
import { findOrCreateMedusaCustomerIdByEmail } from "@/lib/medusa-customer-resolve";
import { getMedusaRegionId } from "@/lib/storefront-medusa-env";
import { extractSessionEmail } from "@apparel-commerce/sdk";
import {
  applyRateLimit,
  parseJsonBody,
  isValidCartId,
  writeCartCookie,
  retrieveCartLines,
  retrieveCartRaw,
} from "@/lib/cart-api-helpers";
import { cartMergePostBodySchema } from "@apparel-commerce/validation";

/**
 * Merges guest session lines into the customer's Medusa cart (combine quantities per variant).
 */
export async function POST(req: Request) {
  const rl = await applyRateLimit(req, "cart-merge", 20, 60_000);
  if (!rl.ok) return rl.response;

  const session = await getServerSession(authOptions);
  const email = extractSessionEmail(session);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody<unknown>(req);
  if (!parsed.ok) return parsed.response;

  const bodyParsed = cartMergePostBodySchema.safeParse(parsed.data);
  if (!bodyParsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: bodyParsed.error.flatten() },
      { status: 400 },
    );
  }

  const guestLines = bodyParsed.data.guestLines ?? [];
  if (guestLines.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, lines: [] as CartLine[] });
  }

  const regionId = getMedusaRegionId()?.trim();
  if (!regionId) {
    return NextResponse.json({ error: "Store region not configured" }, { status: 503 });
  }

  const customerId = await findOrCreateMedusaCustomerIdByEmail(email);
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
      console.error("[cart/merge] create cart failed:", t.slice(0, 300));
      return NextResponse.json(
        { error: "Could not create cart" },
        { status: 502 },
      );
    }
    const created = (await createRes.json()) as { cart?: { id: string } };
    targetCartId = created.cart?.id ?? null;
  }

  if (!isValidCartId(targetCartId)) {
    return NextResponse.json({ error: "No target cart" }, { status: 500 });
  }

  const existing = await retrieveCartRaw(
    targetCartId,
    "*items,*items.id,*items.variant_id,*items.quantity",
  );
  const existingItems = (
    (existing as { items?: Array<{ id?: string; variant_id?: string; quantity?: number }> })
      ?.items ?? []
  );

  const byVariant = new Map<string, number>();
  for (const it of existingItems) {
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
    const vid = gl.variantId;
    const q = Math.max(1, Math.floor(gl.quantity));
    byVariant.set(vid, (byVariant.get(vid) ?? 0) + q);
  }

  for (const it of existingItems) {
    const lineId = typeof it.id === "string" ? it.id : "";
    if (!lineId) continue;
    const delRes = await medusaAdminFetch(
      `/admin/carts/${encodeURIComponent(targetCartId)}/line-items/${encodeURIComponent(lineId)}`,
      { method: "DELETE" },
    );
    if (!delRes.ok && delRes.status !== 404) {
      const t = await delRes.text().catch(() => "");
      console.error("[cart/merge] clear cart lines failed:", t.slice(0, 300));
      return NextResponse.json(
        { error: "Could not clear cart lines" },
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
      console.error("[cart/merge] add line failed:", variantId, t.slice(0, 300));
      return NextResponse.json(
        { error: "Could not add line to cart" },
        { status: 502 },
      );
    }
  }

  const lines = await retrieveCartLines(targetCartId);
  await writeCartCookie(targetCartId);

  return NextResponse.json({ ok: true, cartId: targetCartId, lines: lines ?? [] });
}
