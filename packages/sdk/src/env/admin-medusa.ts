import { getMedusaSecretApiKey, getMedusaStoreBaseUrl } from "../medusa-env";

export function assertAdminMedusaEnvProduction(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (!getMedusaSecretApiKey()) {
    throw new Error(
      "Admin: MEDUSA_SECRET_API_KEY (or MEDUSA_ADMIN_API_SECRET) is required in production.",
    );
  }
  const base = getMedusaStoreBaseUrl().toLowerCase();
  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    throw new Error(
      "Admin: MEDUSA_BACKEND_URL / NEXT_PUBLIC_MEDUSA_URL must be a public HTTPS origin in production (not localhost).",
    );
  }
}
