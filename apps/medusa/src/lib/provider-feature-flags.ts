const PROVIDER_FLAGS: Record<string, string> = {
  stripe: "FEATURE_FLAG_STRIPE",
  paypal: "FEATURE_FLAG_PAYPAL",
  paymongo: "FEATURE_FLAG_PAYMONGO",
  maya: "FEATURE_FLAG_MAYA",
  aftership: "FEATURE_FLAG_AFTERSHIP",
};

export function isProviderEnabled(provider: string): boolean {
  const envKey = PROVIDER_FLAGS[provider.toLowerCase()];
  if (!envKey) return true;

  const value = process.env[envKey];
  if (value === undefined || value === "") return true;
  return value === "1" || value.toLowerCase() === "true";
}

export function getDisabledProviders(): string[] {
  return Object.keys(PROVIDER_FLAGS).filter((p) => !isProviderEnabled(p));
}
