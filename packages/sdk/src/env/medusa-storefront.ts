import {
  getMedusaPublishableKey,
  getMedusaRegionId,
  getMedusaStoreBaseUrl,
} from "../medusa-env";

export function listMissingMedusaStorefrontEnv(): string[] {
  const missing: string[] = [];
  if (!getMedusaPublishableKey()) {
    missing.push(
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY (or MEDUSA_PUBLISHABLE_API_KEY)",
    );
  }
  if (!getMedusaRegionId()) {
    missing.push("NEXT_PUBLIC_MEDUSA_REGION_ID (or MEDUSA_REGION_ID)");
  }
  if (process.env.NODE_ENV === "production") {
    const base = getMedusaStoreBaseUrl().toLowerCase();
    if (base.includes("localhost") || base.includes("127.0.0.1")) {
      missing.push(
        "NEXT_PUBLIC_MEDUSA_URL / MEDUSA_BACKEND_URL must be a public HTTPS origin in production (not localhost)",
      );
    }
  }
  return missing;
}

export function assertMedusaStorefrontEnvProduction(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  const missing = listMissingMedusaStorefrontEnv();
  if (missing.length > 0) {
    throw new Error(
      `Medusa storefront: required env missing: ${missing.join("; ")}`,
    );
  }
}
