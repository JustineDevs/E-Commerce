import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type ProviderStatus = {
  configured: boolean;
  hasWebhookSecret: boolean;
};

function checkProvider(
  keyEnv: string,
  webhookEnv?: string,
): ProviderStatus {
  return {
    configured: Boolean(process.env[keyEnv]?.trim()),
    hasWebhookSecret: webhookEnv
      ? Boolean(process.env[webhookEnv]?.trim())
      : true,
  };
}

/**
 * Reports which payment providers have credentials configured in process.env
 * (Medusa `medusa-config.ts` registration). Admin-only.
 */
export async function GET(
  _req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const providers: Record<string, ProviderStatus> = {
    stripe: checkProvider("STRIPE_API_KEY", "STRIPE_WEBHOOK_SECRET"),
    paypal: checkProvider("PAYPAL_CLIENT_ID", "PAYPAL_WEBHOOK_ID"),
    paymongo: checkProvider("PAYMONGO_SECRET_KEY", "PAYMONGO_WEBHOOK_SECRET"),
    maya: checkProvider("MAYA_SECRET_KEY", "MAYA_WEBHOOK_SECRET"),
    cod: { configured: true, hasWebhookSecret: true },
  };

  const configuredCount = Object.values(providers).filter(
    (p) => p.configured,
  ).length;

  res.json({
    configuredCount,
    providers,
    timestamp: new Date().toISOString(),
  });
}
