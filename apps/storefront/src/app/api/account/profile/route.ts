import { getServerSession } from "next-auth/next";
import {
  storefrontCustomerProfilePatchSchema,
  type StorefrontShippingAddress,
} from "@apparel-commerce/validation";
import { authOptions } from "@/lib/auth";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = storefrontCustomerProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first =
      Object.values(msg).flat()[0] ?? "Check your profile fields and try again.";
    return Response.json({ error: first }, { status: 400 });
  }

  const sb = createStorefrontServiceSupabase();
  if (!sb) {
    return Response.json(
      { error: "Profile save is not available right now." },
      { status: 503 },
    );
  }

  const v = parsed.data;
  const shipping_addresses = (v.shippingAddresses ??
    []) as StorefrontShippingAddress[];

  const { error } = await sb.from("storefront_customer_profiles").upsert(
    {
      email,
      display_name: v.displayName?.trim() || null,
      phone: v.phone?.trim() || null,
      shipping_addresses,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (error) {
    return Response.json({ error: "Unable to save profile." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
