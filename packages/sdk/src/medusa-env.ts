/**
 * Shared Medusa URL and publishable env for storefront, admin server routes, and tooling.
 * Reads MEDUSA_* and NEXT_PUBLIC_MEDUSA_* per SOP-MEDUSA-ENV-AND-LEGACY.
 * Treats empty or whitespace-only values as unset (prevents "Invalid URL" when env is "").
 *
 * Server-side catalog fetches run in Node (Next.js RCS), not in the visitor's browser.
 * If MEDUSA_BACKEND_URL is still http://localhost:9000 (copied from local .env) but
 * NEXT_PUBLIC_MEDUSA_URL is a non-loopback URL (e.g. deployed Medusa on Render), we prefer
 * the public URL so hosted storefronts do not call the host's own localhost.
 */
function stripTrailingSlash(raw: string): string {
  return raw.replace(/\/$/, "");
}

function isLoopbackMedusaUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.startsWith("http://0.0.0.0")
  );
}

export function getMedusaStoreBaseUrl(): string {
  const backend = process.env.MEDUSA_BACKEND_URL?.trim() || undefined;
  const publicUrl = process.env.NEXT_PUBLIC_MEDUSA_URL?.trim() || undefined;

  let raw: string | undefined;
  if (
    backend &&
    isLoopbackMedusaUrl(backend) &&
    publicUrl &&
    !isLoopbackMedusaUrl(publicUrl)
  ) {
    raw = publicUrl;
  } else {
    raw = backend ?? publicUrl ?? "http://localhost:9000";
  }

  const url = stripTrailingSlash(raw);
  if (!url) return "http://localhost:9000";
  try {
    new URL(url);
    return url;
  } catch {
    return "http://localhost:9000";
  }
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
