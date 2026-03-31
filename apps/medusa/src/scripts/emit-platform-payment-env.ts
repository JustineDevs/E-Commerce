/**
 * Prints a single JSON object of process.env keys Medusa should set from
 * Supabase `payment_connections` (payment PSPs + Aftership courier BYOK).
 * Invoked synchronously from medusa-config when PAYMENT_CREDENTIALS_SOURCE=platform (or supabase).
 *
 * JSON field names for each provider must match `mapPaymentSecretJsonKeyToEnvVar`
 * in `src/lib/payment-provider-secret-env-map.ts` (async BYOK uses that map).
 */
import { createClient } from "@supabase/supabase-js";

import type { PaymentProvider, PaymentConnectionStatus, PaymentConnectionMode } from "@apparel-commerce/types";

type Row = {
  id: string;
  provider: PaymentProvider;
  region_id: string | null;
  status: PaymentConnectionStatus;
  mode: PaymentConnectionMode;
  secret_ciphertext: string;
  updated_at: string;
};

function statusRank(s: string): number {
  if (s === "enabled") return 2;
  if (s === "sandbox_verified") return 1;
  return 0;
}

function pickRows(rows: Row[], production: boolean): Row[] {
  return rows.filter((r) => {
    if (r.status === "enabled") return true;
    if (r.status === "sandbox_verified" && !production) return true;
    return false;
  });
}

function pickBest(
  list: Row[],
  provider: string,
  regionPref: string,
): Row | undefined {
  const subset = list.filter((r) => r.provider === provider);
  if (subset.length === 0) return undefined;
  const scored = subset.map((r) => {
    let score = statusRank(r.status) * 100;
    if (regionPref && r.region_id === regionPref) score += 50;
    if (r.region_id == null) score += 5;
    const t = new Date(r.updated_at).getTime();
    return { r, score, t };
  });
  scored.sort((a, b) => b.score - a.score || b.t - a.t);
  return scored[0]?.r;
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    process.stdout.write("{}\n");
    return;
  }

  const { decryptJsonEnvelope } = await import(
    "@apparel-commerce/payment-connection-crypto",
  );

  const sb = createClient(url, key);
  const { data, error } = await sb
    .from("payment_connections")
    .select(
      "id,provider,region_id,status,secret_ciphertext,updated_at,mode",
    );

  if (error) throw error;

  const rows = pickRows((data ?? []) as Row[], process.env.NODE_ENV === "production");
  const regionPref =
    process.env.MEDUSA_PAYMENT_REGION_ID?.trim() ||
    process.env.MEDUSA_DEFAULT_REGION_ID?.trim() ||
    "";

  const env: Record<string, string> = {};

  const stripe = pickBest(rows, "stripe", regionPref);
  if (stripe) {
    const s = (await decryptJsonEnvelope(stripe.secret_ciphertext)) as {
      secretKey?: string;
      webhookSecret?: string;
    };
    if (s.secretKey) env.STRIPE_API_KEY = s.secretKey;
    if (s.webhookSecret) env.STRIPE_WEBHOOK_SECRET = s.webhookSecret;
  }

  const paypal = pickBest(rows, "paypal", regionPref);
  if (paypal) {
    const s = (await decryptJsonEnvelope(paypal.secret_ciphertext)) as {
      clientId?: string;
      clientSecret?: string;
      webhookId?: string;
      environment?: string;
    };
    if (s.clientId) env.PAYPAL_CLIENT_ID = s.clientId;
    if (s.clientSecret) env.PAYPAL_CLIENT_SECRET = s.clientSecret;
    if (s.webhookId) env.PAYPAL_WEBHOOK_ID = s.webhookId;
    const paypalMode =
      s.environment === "live" || paypal.mode === "production" ? "live" : "sandbox";
    env.PAYPAL_ENVIRONMENT = paypalMode;
  }

  const paymongo = pickBest(rows, "paymongo", regionPref);
  if (paymongo) {
    const s = (await decryptJsonEnvelope(paymongo.secret_ciphertext)) as {
      secretKey?: string;
      webhookSecret?: string;
    };
    if (s.secretKey) env.PAYMONGO_SECRET_KEY = s.secretKey;
    if (s.webhookSecret) env.PAYMONGO_WEBHOOK_SECRET = s.webhookSecret;
  }

  const maya = pickBest(rows, "maya", regionPref);
  if (maya) {
    const s = (await decryptJsonEnvelope(maya.secret_ciphertext)) as {
      secretKey?: string;
      webhookSecret?: string;
    };
    if (s.secretKey) env.MAYA_SECRET_KEY = s.secretKey;
    if (s.webhookSecret) env.MAYA_WEBHOOK_SECRET = s.webhookSecret;
    env.MAYA_SANDBOX = maya.mode === "production" ? "false" : "true";
  }

  const aftership = pickBest(rows, "aftership", regionPref);
  if (aftership) {
    const s = (await decryptJsonEnvelope(aftership.secret_ciphertext)) as {
      apiKey?: string;
      webhookSecret?: string;
      courierSlug?: string;
    };
    if (s.apiKey) env.AFTERSHIP_API_KEY = s.apiKey;
    if (s.webhookSecret) env.AFTERSHIP_WEBHOOK_SECRET = s.webhookSecret;
    if (s.courierSlug?.trim()) {
      env.AFTERSHIP_COURIER_SLUG = s.courierSlug.trim();
    }
  }

  process.stdout.write(`${JSON.stringify(env)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
