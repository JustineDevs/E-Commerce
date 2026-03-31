import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { loadCustomerProfile } from "@/lib/server-customer-profile";
import {
  isStorefrontProfileComplete,
  listMissingProfileParts,
} from "@/lib/storefront-profile-complete";
import { profileToCodCartAddresses } from "@/lib/medusa-profile-address";

export const dynamic = "force-dynamic";

/**
 * Server-validated delivery identity for COD. Client must not invent addresses.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return Response.json({ error: "Sign in to use cash on delivery." }, { status: 401 });
  }

  const profile = await loadCustomerProfile(email);
  if (!profile || !isStorefrontProfileComplete(profile)) {
    return Response.json(
      {
        error: "Complete your delivery profile before choosing cash on delivery.",
        missingFields: listMissingProfileParts(profile),
      },
      { status: 400 },
    );
  }

  const payload = profileToCodCartAddresses(profile, email);
  if (!payload) {
    return Response.json(
      {
        error: "Add a delivery address in your account before using cash on delivery.",
        missingFields: ["Delivery address"],
      },
      { status: 400 },
    );
  }

  return Response.json(payload);
}
