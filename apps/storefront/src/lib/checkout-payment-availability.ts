import {
  PAYMENT_PROVIDER_IDS,
  type PaymentProviderKey,
} from "@/lib/medusa-checkout";

export type CheckoutPaymentAvailabilitySource = "medusa" | "env";

/**
 * When the storefront can read your Medusa region (see `/api/checkout/available-payment-methods`),
 * every method attached to that region is offered, optionally filtered by
 * `NEXT_PUBLIC_CHECKOUT_PAYMENT_PROVIDERS`.
 *
 * If that API is unavailable, this env-only fallback runs:
 * - Set `NEXT_PUBLIC_CHECKOUT_PAYMENT_PROVIDERS` to a comma-separated list (STRIPE, PAYPAL, PAYMONGO, MAYA, COD).
 * - If unset: **all** of those keys are shown as selectable. `NEXT_PUBLIC_MEDUSA_PAYMENT_PROVIDER_ID` only picks
 *   which option is pre-selected (default highlight). Each method must still be attached to your Medusa region
 *   or payment session creation will fail for that choice.
 */
export function getEnvOnlyCheckoutPaymentAvailability(): {
  available: Record<PaymentProviderKey, boolean>;
  preferredKey: PaymentProviderKey;
} {
  const allKeys = Object.keys(PAYMENT_PROVIDER_IDS) as PaymentProviderKey[];
  const raw = process.env.NEXT_PUBLIC_CHECKOUT_PAYMENT_PROVIDERS?.trim();

  let enabled: PaymentProviderKey[];
  if (raw) {
    const parts = raw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    enabled = parts.filter((p): p is PaymentProviderKey =>
      allKeys.includes(p as PaymentProviderKey),
    );
    if (enabled.length === 0) {
      enabled = [];
    }
  } else {
    const def =
      process.env.NEXT_PUBLIC_MEDUSA_PAYMENT_PROVIDER_ID?.trim() ||
      "pp_stripe_stripe";
    const entry = Object.entries(PAYMENT_PROVIDER_IDS).find(([, id]) => id === def);
    const primary = entry
      ? (entry[0] as PaymentProviderKey)
      : ("STRIPE" as PaymentProviderKey);
    const rest = allKeys.filter((k) => k !== primary);
    enabled = [primary, ...rest];
  }

  const available = Object.fromEntries(
    allKeys.map((k) => [k, enabled.includes(k)]),
  ) as Record<PaymentProviderKey, boolean>;

  const preferredKey = enabled[0] ?? "STRIPE";

  return { available, preferredKey };
}

function mergeMedusaRegionWithEnvAllowlist(regionKeys: PaymentProviderKey[]): {
  available: Record<PaymentProviderKey, boolean>;
  preferredKey: PaymentProviderKey;
} {
  const allKeys = Object.keys(PAYMENT_PROVIDER_IDS) as PaymentProviderKey[];
  const raw = process.env.NEXT_PUBLIC_CHECKOUT_PAYMENT_PROVIDERS?.trim();
  let envAllow: Set<PaymentProviderKey> | null = null;
  if (raw) {
    const parts = raw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .filter((p): p is PaymentProviderKey =>
        allKeys.includes(p as PaymentProviderKey),
      );
    if (parts.length > 0) {
      envAllow = new Set(parts);
    }
  }

  const regionSet = new Set(regionKeys);
  const available = Object.fromEntries(
    allKeys.map((k) => [
      k,
      regionSet.has(k) && (!envAllow || envAllow.has(k)),
    ]),
  ) as Record<PaymentProviderKey, boolean>;

  const preferredKey =
    allKeys.find((k) => available[k]) ?? regionKeys[0] ?? "STRIPE";

  return { available, preferredKey };
}

/**
 * Prefer non-empty `medusaRegionKeys` from GET `/api/checkout/available-payment-methods`
 * so the UI matches Medusa Admin → Regions → payment providers.
 */
export function resolveCheckoutPaymentAvailability(
  medusaRegionKeys: PaymentProviderKey[] | null | undefined,
): {
  available: Record<PaymentProviderKey, boolean>;
  preferredKey: PaymentProviderKey;
  source: CheckoutPaymentAvailabilitySource;
} {
  if (Array.isArray(medusaRegionKeys) && medusaRegionKeys.length > 0) {
    return {
      ...mergeMedusaRegionWithEnvAllowlist(medusaRegionKeys),
      source: "medusa",
    };
  }
  return {
    ...getEnvOnlyCheckoutPaymentAvailability(),
    source: "env",
  };
}

/** @deprecated Prefer `resolveCheckoutPaymentAvailability` after loading region keys from the API. */
export function getCheckoutPaymentAvailability(): {
  available: Record<PaymentProviderKey, boolean>;
  preferredKey: PaymentProviderKey;
} {
  return getEnvOnlyCheckoutPaymentAvailability();
}
