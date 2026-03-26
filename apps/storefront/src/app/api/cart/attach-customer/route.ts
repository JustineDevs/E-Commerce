import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { MEDUSA_CART_COOKIE } from "@/lib/cart-cookie";
import { medusaAdminFetch } from "@/lib/medusa-admin-fetch";

/**
 * Links the HttpOnly Medusa cart cookie to a Medusa customer by email (NextAuth).
 * Enables cart ownership to follow the signed-in user for server-side fulfillment.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, skipped: true });
  }

  const jar = await cookies();
  const cartId = jar.get(MEDUSA_CART_COOKIE)?.value?.trim();
  if (!cartId?.startsWith("cart_")) {
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
      return NextResponse.json(
        { ok: false, error: "cart_update_failed", detail: text.slice(0, 200) },
        { status: patchRes.status >= 500 ? 502 : 400 },
      );
    }

    return NextResponse.json({ ok: true, cartId, customerId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("MEDUSA_SECRET_API_KEY")) {
      return NextResponse.json({ ok: false, skipped: true });
    }
    return NextResponse.json({ ok: false, error: msg.slice(0, 200) }, { status: 500 });
  }
}
