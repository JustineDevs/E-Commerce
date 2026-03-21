/**
 * Shared Medusa URL and publishable env for storefront, admin server routes, and tooling.
 * Reads MEDUSA_* and NEXT_PUBLIC_MEDUSA_* per SOP-MEDUSA-ENV-AND-LEGACY.
 */
export function getMedusaStoreBaseUrl(): string {
  const fromEnv =
    process.env.MEDUSA_BACKEND_URL ??
    process.env.NEXT_PUBLIC_MEDUSA_URL ??
    "http://localhost:9000";
  return fromEnv.replace(/\/$/, "");
}

export function getMedusaSecretApiKey(): string | undefined {
  const k =
    process.env.MEDUSA_SECRET_API_KEY?.trim() ||
    process.env.MEDUSA_ADMIN_API_SECRET?.trim();
  return k || undefined;
}

export function getMedusaPublishableKey(): string | undefined {
  const k =
    process.env.MEDUSA_PUBLISHABLE_API_KEY ??
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  return k?.trim() || undefined;
}

export function getMedusaRegionId(): string | undefined {
  const r =
    process.env.MEDUSA_REGION_ID ?? process.env.NEXT_PUBLIC_MEDUSA_REGION_ID;
  return r?.trim() || undefined;
}

export function getMedusaPaymentProviderId(): string {
  return (
    process.env.NEXT_PUBLIC_MEDUSA_PAYMENT_PROVIDER_ID?.trim() ||
    "pp_lemonsqueezy_lemonsqueezy"
  );
}

export function getMedusaSalesChannelId(): string | undefined {
  return (
    process.env.MEDUSA_SALES_CHANNEL_ID?.trim() ||
    process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID?.trim() ||
    undefined
  );
}
