/**
 * Maps decrypted `payment_connections.secret_ciphertext` JSON field names to
 * `process.env` keys that `medusa-config.ts` and Medusa payment modules read.
 *
 * Medusa and vendor integrations resolve credentials from `process.env` at
 * bootstrap (and some modules cache options at load). BYOK loaders therefore
 * must assign decrypted strings to these names. Supplying secrets only through
 * a custom in-memory object would require upstream Medusa / plugin API changes.
 *
 * Keep in sync with `src/scripts/emit-platform-payment-env.ts` (sync boot path).
 */
export function mapPaymentSecretJsonKeyToEnvVar(
  provider: string,
  secretJsonKey: string,
): string | null {
  const map: Record<string, Record<string, string>> = {
    stripe: {
      secretKey: "STRIPE_API_KEY",
      webhookSecret: "STRIPE_WEBHOOK_SECRET",
    },
    paypal: {
      clientId: "PAYPAL_CLIENT_ID",
      clientSecret: "PAYPAL_CLIENT_SECRET",
      webhookId: "PAYPAL_WEBHOOK_ID",
      environment: "PAYPAL_ENVIRONMENT",
    },
    paymongo: {
      secretKey: "PAYMONGO_SECRET_KEY",
      webhookSecret: "PAYMONGO_WEBHOOK_SECRET",
    },
    maya: {
      secretKey: "MAYA_SECRET_KEY",
      webhookSecret: "MAYA_WEBHOOK_SECRET",
    },
    aftership: {
      apiKey: "AFTERSHIP_API_KEY",
      webhookSecret: "AFTERSHIP_WEBHOOK_SECRET",
      courierSlug: "AFTERSHIP_COURIER_SLUG",
    },
  };
  return map[provider]?.[secretJsonKey] ?? null;
}
