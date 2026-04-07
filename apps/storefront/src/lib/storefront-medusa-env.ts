import {
  getMedusaStoreBaseUrl as getMedusaStoreBaseUrlBase,
  getMedusaPublishableKey as getMedusaPublishableKeyBase,
  getMedusaRegionId as getMedusaRegionIdBase,
  getMedusaPaymentProviderId as getMedusaPaymentProviderIdBase,
  getMedusaSalesChannelId as getMedusaSalesChannelIdBase,
  getMedusaSecretApiKey as getMedusaSecretApiKeyBase,
  withSalesChannelId as withSalesChannelIdBase,
} from "@apparel-commerce/sdk";

import { ensureStorefrontRuntimeEnvLoaded } from "./storefront-runtime-env";

export function getMedusaStoreBaseUrl(): string {
  ensureStorefrontRuntimeEnvLoaded();
  return getMedusaStoreBaseUrlBase();
}

export function getMedusaPublishableKey(): string | undefined {
  ensureStorefrontRuntimeEnvLoaded();
  return getMedusaPublishableKeyBase();
}

export function getMedusaRegionId(): string | undefined {
  ensureStorefrontRuntimeEnvLoaded();
  return getMedusaRegionIdBase();
}

export function getMedusaPaymentProviderId(): string {
  ensureStorefrontRuntimeEnvLoaded();
  return getMedusaPaymentProviderIdBase();
}

export function getMedusaSalesChannelId(): string | undefined {
  ensureStorefrontRuntimeEnvLoaded();
  return getMedusaSalesChannelIdBase();
}

export function getMedusaSecretApiKey(): string | undefined {
  ensureStorefrontRuntimeEnvLoaded();
  return getMedusaSecretApiKeyBase();
}

export function withSalesChannelId(
  params: Record<string, unknown>,
): Record<string, unknown> {
  ensureStorefrontRuntimeEnvLoaded();
  return withSalesChannelIdBase(params);
}
