import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { loadCustomerProfile } from "@/lib/server-customer-profile";
import {
  isStorefrontProfileComplete,
  listMissingProfileParts,
} from "@/lib/storefront-profile-complete";
import { profileToCodCartAddresses } from "@/lib/medusa-profile-address";
import { executeMedusaCheckoutTotalsPreview } from "@/lib/medusa-checkout-cart-prep";

export const dynamic = "force-dynamic";

type Body = {
  lines?: Array<{ variantId?: string; quantity?: number }>;
  email?: string;
  loyaltyPointsToRedeem?: number;
  paymentMethod?: string;
};

function isCodPaymentMethod(method: string | undefined): boolean {
  return String(method ?? "").toUpperCase() === "COD";
}

/**
 * Server-side Medusa pricing preview (shipping + catalog + tax + loyalty).
 * Uses the same env resolution as other server routes (MEDUSA_BACKEND_URL vs public URL).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email?.trim().toLowerCase();
  if (!sessionEmail) {
    return Response.json({ error: "Sign in to load checkout totals." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawLines = Array.isArray(body.lines) ? body.lines : [];
  const lines = rawLines
    .map((l) => ({
      variantId: typeof l.variantId === "string" ? l.variantId.trim() : "",
      quantity:
        typeof l.quantity === "number" && Number.isFinite(l.quantity)
          ? Math.max(1, Math.floor(l.quantity))
          : 0,
    }))
    .filter((l) => l.variantId.length > 0 && l.quantity > 0);

  if (lines.length === 0) {
    return Response.json({ error: "Add at least one line item." }, { status: 400 });
  }

  const paymentMethodRaw = String(body.paymentMethod ?? "STRIPE");
  const loyaltyRaw = body.loyaltyPointsToRedeem;
  const loyaltyPointsToRedeem =
    typeof loyaltyRaw === "number" &&
    Number.isFinite(loyaltyRaw) &&
    loyaltyRaw > 0
      ? Math.floor(loyaltyRaw)
      : undefined;

  const emailFromBody =
    typeof body.email === "string" ? body.email.trim() : "";

  try {
    if (isCodPaymentMethod(paymentMethodRaw)) {
      const profile = await loadCustomerProfile(sessionEmail);
      if (!profile || !isStorefrontProfileComplete(profile)) {
        return Response.json(
          {
            error:
              "Complete your delivery profile before previewing cash on delivery totals.",
            missingFields: listMissingProfileParts(profile),
          },
          { status: 400 },
        );
      }
      const codCartPayload = profileToCodCartAddresses(profile, sessionEmail);
      if (!codCartPayload) {
        return Response.json(
          { error: "Add a delivery address before previewing COD totals." },
          { status: 400 },
        );
      }
      const preview = await executeMedusaCheckoutTotalsPreview({
        lines,
        loyaltyPointsToRedeem,
        codCartPayload,
      });
      return Response.json(preview);
    }

    const preview = await executeMedusaCheckoutTotalsPreview({
      lines,
      email: emailFromBody || sessionEmail,
      loyaltyPointsToRedeem,
    });
    return Response.json(preview);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout preview failed.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
