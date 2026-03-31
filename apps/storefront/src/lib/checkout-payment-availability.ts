import {
  PAYMENT_PROVIDER_IDS,
  type PaymentProviderKey,
} from "@/lib/medusa-checkout";

/**
 * BYOK / owner configuration: set `NEXT_PUBLIC_CHECKOUT_PAYMENT_PROVIDERS` to a comma-separated
 * list of keys (STRIPE, PAYPAL, PAYMONGO, MAYA, COD). Only listed providers are selectable.
 * If unset, the default online provider from `NEXT_PUBLIC_MEDUSA_PAYMENT_PROVIDER_ID` plus COD
 * are available (typical Philippines setup). Other PSPs show as not configured.
 */
export function getCheckoutPaymentAvailability(): {
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
    enabled = Array.from(
      new Set<PaymentProviderKey>([primary, "COD"]),
    );
  }

  const available = Object.fromEntries(
    allKeys.map((k) => [k, enabled.includes(k)]),
  ) as Record<PaymentProviderKey, boolean>;

  const preferredKey = enabled[0] ?? "STRIPE";

  return { available, preferredKey };
}
