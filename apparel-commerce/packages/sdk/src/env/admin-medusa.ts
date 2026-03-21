import { getMedusaSecretApiKey } from "../medusa-env";

export function assertAdminMedusaEnvProduction(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (!getMedusaSecretApiKey()) {
    throw new Error(
      "Admin: MEDUSA_SECRET_API_KEY (or MEDUSA_ADMIN_API_SECRET) is required in production.",
    );
  }
}
