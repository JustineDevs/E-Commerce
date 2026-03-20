import Medusa from "@medusajs/js-sdk";
import { getMedusaPublishableKey, getMedusaStoreBaseUrl } from "./storefront-medusa-env";

export function createStorefrontMedusaSdk(): Medusa {
  const baseUrl = getMedusaStoreBaseUrl();
  const publishableKey = getMedusaPublishableKey();
  if (!publishableKey) {
    throw new Error("Medusa publishable API key is not configured.");
  }
  return new Medusa({ baseUrl, publishableKey });
}
