export function getMedusaStoreBaseUrl(): string {
  const fromEnv =
    process.env.MEDUSA_BACKEND_URL ??
    process.env.NEXT_PUBLIC_MEDUSA_URL ??
    "http://localhost:9000";
  return fromEnv.replace(/\/$/, "");
}

export function getMedusaPublishableKey(): string | undefined {
  const k = process.env.MEDUSA_PUBLISHABLE_API_KEY ?? process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  return k?.trim() || undefined;
}

export function getMedusaRegionId(): string | undefined {
  const r = process.env.MEDUSA_REGION_ID ?? process.env.NEXT_PUBLIC_MEDUSA_REGION_ID;
  return r?.trim() || undefined;
}

export function getMedusaPaymentProviderId(): string {
  return (
    process.env.NEXT_PUBLIC_MEDUSA_PAYMENT_PROVIDER_ID?.trim() || "pp_lemonsqueezy_lemonsqueezy"
  );
}
