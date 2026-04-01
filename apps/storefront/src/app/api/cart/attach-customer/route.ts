import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { medusaAdminFetch } from "@/lib/medusa-admin-fetch";
import {
  applyRateLimit,
  applyUserRateLimit,
  readCartIdFromCookie,
} from "@/lib/cart-api-helpers";
import { extractSessionEmail } from "@apparel-commerce/sdk";

/** IP window kept long enough that sequential E2E bursts under load still hit 429 before the window resets. */
const ATTACH_CUSTOMER_IP_WINDOW_MS = 300_000;

export async function POST(req: Request) {
  const rl = await applyRateLimit(req, "cart-attach", 25, ATTACH_CUSTOMER_IP_WINDOW_MS);
  if (!rl.ok) return rl.response;

  const session = await getServerSession(authOptions);
  const email = extractSessionEmail(session);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRl = await applyUserRateLimit(email, "cart-attach", 15, 60_000);
  if (!userRl.ok) return userRl.response;

  const cartId = await readCartIdFromCookie();
  if (!cartId) {
    return NextResponse.json({ ok: false, skipped: true });
  }

  try {
    let listRes = await medusaAdminFetch(
      `/admin/customers?q=${encodeURIComponent(email)}`,
    );
    if (!listRes.ok) {
      listRes = await medusaAdminFetch(
        `/admin/customers?email=${encodeURIComponent(email)}`,
      );
    }
    if (!listRes.ok) {
      return NextResponse.json({ ok: false, error: "customer_lookup_failed" });
    }
    const listJson = (await listRes.json()) as {
      customers?: Array<{ id: string }>;
    };
    let customerId = listJson.customers?.[0]?.id;

    if (!customerId) {
      const createRes = await medusaAdminFetch("/admin/customers", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (!createRes.ok) {
        return NextResponse.json({ ok: false, error: "customer_create_failed" });
      }
      const created = (await createRes.json()) as { customer?: { id: string } };
      customerId = created.customer?.id;
    }

    if (!customerId) {
      return NextResponse.json({ ok: false, error: "no_customer_id" });
    }

    let patchRes = await medusaAdminFetch(
      `/admin/carts/${encodeURIComponent(cartId)}`,
      {
        method: "POST",
        body: JSON.stringify({ customer_id: customerId }),
      },
    );
    if (!patchRes.ok) {
      patchRes = await medusaAdminFetch(
        `/admin/carts/${encodeURIComponent(cartId)}/customer`,
        {
          method: "POST",
          body: JSON.stringify({ customer_id: customerId }),
        },
      );
    }

    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => "");
      console.error("[cart/attach-customer] cart update failed:", text.slice(0, 300));
      return NextResponse.json(
        { ok: false, error: "cart_update_failed" },
        { status: patchRes.status >= 500 ? 502 : 400 },
      );
    }

    return NextResponse.json({ ok: true, cartId, customerId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("MEDUSA_SECRET_API_KEY")) {
      return NextResponse.json({ ok: false, skipped: true });
    }
    console.error("[cart/attach-customer] unhandled:", msg.slice(0, 300));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
