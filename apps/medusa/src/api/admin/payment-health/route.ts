import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getByokHealthStatus } from "../../../lib/apply-platform-payment-env-async";

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
 * Reports which payment providers have credentials configured in env
 * without revealing actual values. Admin-only (behind Medusa admin auth).
 * Also includes BYOK async loader health when platform credentials are in use.
 */
export async function GET(
  _req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const credentialSource =
    process.env.PAYMENT_CREDENTIALS_SOURCE?.trim().toLowerCase() ?? "file";
  const isProd = process.env.NODE_ENV === "production";
  const mandateOff = process.env.MEDUSA_BYOK_MANDATE_OFF?.trim() === "1";
  const productionByokMandateActive = isProd && !mandateOff;
  const productionByokMandateMet =
    !productionByokMandateActive ||
    credentialSource === "platform" ||
    credentialSource === "supabase";

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

  const byokHealth = getByokHealthStatus();
  const byokAttentionRecommended =
    !productionByokMandateMet ||
    byokHealth.operatorAlertRecommended ||
    Boolean(byokHealth.error?.trim());

  res.json({
    credentialSource,
    configuredCount,
    providers,
    byokAsync: byokHealth,
    byokPolicy: {
      productionByokMandateActive,
      productionByokMandateMet,
      mandateBreakGlass: mandateOff,
    },
    byokAttentionRecommended,
    timestamp: new Date().toISOString(),
  });
}
