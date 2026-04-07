import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { loadCustomerProfile } from "@/lib/server-customer-profile";
import {
  isStorefrontProfileComplete,
  listMissingProfileParts,
} from "@/lib/storefront-profile-complete";
import { profileToCodCartAddresses } from "@/lib/medusa-profile-address";
import { logCommerceObservabilityServer } from "@/lib/commerce-observability";
import {
  handleMedusaTotalsPreviewRequest,
} from "@/lib/medusa-totals-preview-route-handler";
import { executeMedusaCheckoutTotalsPreview } from "@/lib/medusa-checkout-cart-prep";

export const dynamic = "force-dynamic";

/**
 * Server-side Medusa pricing preview (shipping + catalog + tax + loyalty).
 * Uses the same env resolution as other server routes (MEDUSA_BACKEND_URL vs public URL).
 */
export async function POST(req: Request) {
  return handleMedusaTotalsPreviewRequest(req, {
    getSessionEmail: async () => {
      const session = await getServerSession(authOptions);
      return session?.user?.email?.trim().toLowerCase() ?? null;
    },
    loadCustomerProfile,
    isProfileComplete: isStorefrontProfileComplete,
    listMissingProfileParts,
    profileToCodCartAddresses,
    executePreview: executeMedusaCheckoutTotalsPreview,
    logEvent: (event, payload) => {
      logCommerceObservabilityServer(
        event as Parameters<typeof logCommerceObservabilityServer>[0],
        payload,
      );
    },
  });
}
