import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { loadCustomerProfile } from "@/lib/server-customer-profile";
import {
  isStorefrontProfileComplete,
  listMissingProfileParts,
} from "@/lib/storefront-profile-complete";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return Response.json({ authenticated: false, complete: false });
  }
  const profile = await loadCustomerProfile(email);
  const complete = isStorefrontProfileComplete(profile);
  return Response.json({
    authenticated: true,
    complete,
    missingFields: complete ? [] : listMissingProfileParts(profile),
    profile: profile
      ? {
          displayName: profile.displayName,
          phone: profile.phone,
          shippingAddresses: profile.shippingAddresses,
        }
      : null,
  });
}
