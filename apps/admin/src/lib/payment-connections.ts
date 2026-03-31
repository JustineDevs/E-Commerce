import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decryptJsonEnvelope,
  encryptJsonEnvelope,
  type CryptoScheme,
} from "@apparel-commerce/payment-connection-crypto";
import { insertStaffAuditLog } from "@/lib/staff-audit";

export const PAYMENT_PROVIDERS = [
  "stripe",
  "paypal",
  "paymongo",
  "maya",
  "cod",
  "aftership",
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type PaymentConnectionMode = "sandbox" | "production";
export type PaymentConnectionStatus =
  | "draft"
  | "sandbox_verified"
  | "enabled"
  | "disabled"
  | "verification_failed";
export type PaymentWebhookStatus = "unknown" | "healthy" | "failing";

export type PaymentConnectionSafe = {
  id: string;
  provider: PaymentProvider;
  regionId: string | null;
  label: string;
  mode: PaymentConnectionMode;
  status: PaymentConnectionStatus;
  webhookStatus: PaymentWebhookStatus;
  lastVerifiedAt: string | null;
  lastTestResult: string | null;
  secretHint: string;
  cryptoScheme: CryptoScheme;
  kekKeyId: string | null;
  keyVersion: number | null;
  secretRotatedAt: string | null;
  metadata: Record<string, unknown>;
  createdByEmail: string | null;
  updatedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaymentConnectionRow = {
  id: string;
  provider: string;
  region_id: string | null;
  label: string;
  mode: string;
  status: string;
  webhook_status: string;
  last_verified_at: string | null;
  last_test_result: string | null;
  secret_ciphertext: string;
  secret_hint: string;
  crypto_scheme?: string;
  kek_key_id?: string | null;
  crypto_key_version?: number | null;
  secret_rotated_at?: string | null;
  metadata: Record<string, unknown> | null;
  created_by_email: string | null;
  updated_by_email: string | null;
  created_at: string;
  updated_at: string;
};

import type { ProviderSecrets } from "@apparel-commerce/types";

async function decryptSecretsWithAudit(
  client: SupabaseClient,
  row: PaymentConnectionRow,
  input: { actorEmail: string; purpose: string },
): Promise<ProviderSecrets> {
  const raw = await decryptJsonEnvelope(row.secret_ciphertext);
  await insertStaffAuditLog(client, {
    actorEmail: input.actorEmail,
    action: "payment_connection.secret_decrypt",
    resource: `payment_connection:${row.id}`,
    details: {
      purpose: input.purpose,
      provider: row.provider,
      crypto_scheme: row.crypto_scheme,
    },
  });
  return raw as ProviderSecrets;
}

function parseProvider(provider: unknown): PaymentProvider {
  const p = typeof provider === "string" ? provider.trim().toLowerCase() : "";
  if (PAYMENT_PROVIDERS.includes(p as PaymentProvider)) return p as PaymentProvider;
  throw new Error("Unsupported provider.");
}

function parseMode(mode: unknown): PaymentConnectionMode {
  return mode === "production" ? "production" : "sandbox";
}

function nonEmpty(value: unknown, field: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new Error(`${field} is required.`);
  return v;
}

function parseSecrets(provider: PaymentProvider, raw: unknown): ProviderSecrets {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (provider === "cod") return { provider: "cod" };
  if (provider === "stripe") {
    return {
      provider,
      secretKey: nonEmpty(obj.secretKey, "Stripe secret key"),
      webhookSecret:
        typeof obj.webhookSecret === "string" ? obj.webhookSecret.trim() || undefined : undefined,
    };
  }
  if (provider === "paypal") {
    const environment =
      obj.environment === "live" || obj.environment === "sandbox"
        ? obj.environment
        : undefined;
    return {
      provider,
      clientId: nonEmpty(obj.clientId, "PayPal client id"),
      clientSecret: nonEmpty(obj.clientSecret, "PayPal client secret"),
      webhookId:
        typeof obj.webhookId === "string" ? obj.webhookId.trim() || undefined : undefined,
      environment,
    };
  }
  if (provider === "paymongo") {
    return {
      provider,
      secretKey: nonEmpty(obj.secretKey, "PayMongo secret key"),
      webhookSecret:
        typeof obj.webhookSecret === "string" ? obj.webhookSecret.trim() || undefined : undefined,
    };
  }
  if (provider === "maya") {
    return {
      provider,
      secretKey: nonEmpty(obj.secretKey, "Maya secret key"),
      webhookSecret:
        typeof obj.webhookSecret === "string" ? obj.webhookSecret.trim() || undefined : undefined,
    };
  }
  if (provider === "aftership") {
    return {
      provider: "aftership",
      apiKey: nonEmpty(obj.apiKey, "Aftership API key"),
      webhookSecret:
        typeof obj.webhookSecret === "string" ? obj.webhookSecret.trim() || undefined : undefined,
      courierSlug:
        typeof obj.courierSlug === "string"
          ? obj.courierSlug.trim().slice(0, 80) || undefined
          : undefined,
    };
  }
  throw new Error("Unsupported provider.");
}

function secretHint(secrets: ProviderSecrets): string {
  switch (secrets.provider) {
    case "cod":
      return "No secret required";
    case "stripe": {
      const tail = secrets.secretKey.slice(-4);
      return `Stripe key ending in ${tail}`;
    }
    case "paypal": {
      const tail = secrets.clientId.slice(-4);
      return `PayPal client ending in ${tail}`;
    }
    case "paymongo": {
      const tail = secrets.secretKey.slice(-4);
      return `PayMongo key ending in ${tail}`;
    }
    case "maya": {
      const tail = secrets.secretKey.slice(-4);
      return `Maya key ending in ${tail}`;
    }
    case "aftership": {
      const tail = secrets.apiKey.slice(-4);
      return `Aftership key ending in ${tail}`;
    }
    default: {
      const _exhaustive: never = secrets;
      return _exhaustive;
    }
  }
}

function mapRow(row: PaymentConnectionRow): PaymentConnectionSafe {
  const scheme = (row.crypto_scheme as CryptoScheme) || "v1-direct";
  return {
    id: row.id,
    provider: parseProvider(row.provider),
    regionId: row.region_id,
    label: row.label,
    mode: parseMode(row.mode),
    status: (row.status as PaymentConnectionStatus) ?? "draft",
    webhookStatus: (row.webhook_status as PaymentWebhookStatus) ?? "unknown",
    lastVerifiedAt: row.last_verified_at,
    lastTestResult: row.last_test_result,
    secretHint: row.secret_hint,
    cryptoScheme: scheme,
    kekKeyId: row.kek_key_id ?? null,
    keyVersion: row.crypto_key_version ?? null,
    secretRotatedAt: row.secret_rotated_at ?? null,
    metadata: row.metadata ?? {},
    createdByEmail: row.created_by_email,
    updatedByEmail: row.updated_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPaymentConnections(
  client: SupabaseClient,
): Promise<PaymentConnectionSafe[]> {
  const { data, error } = await client
    .from("payment_connections")
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PaymentConnectionRow[]).map(mapRow);
}

export async function createPaymentConnection(
  client: SupabaseClient,
  input: {
    actorEmail: string;
    provider: unknown;
    label?: unknown;
    regionId?: unknown;
    mode?: unknown;
    metadata?: unknown;
    secrets?: unknown;
  },
): Promise<PaymentConnectionSafe> {
  const provider = parseProvider(input.provider);
  const mode = parseMode(input.mode);
  const label = typeof input.label === "string" ? input.label.trim().slice(0, 120) : "";
  const regionId =
    typeof input.regionId === "string" && input.regionId.trim().length > 0
      ? input.regionId.trim()
      : null;
  const metadata =
    input.metadata && typeof input.metadata === "object"
      ? (input.metadata as Record<string, unknown>)
      : {};
  const secrets = parseSecrets(provider, input.secrets);
  const enc = await encryptJsonEnvelope(secrets);
  const row = {
    id: crypto.randomUUID(),
    provider,
    region_id: regionId,
    label: label || provider.toUpperCase(),
    mode,
    status: "draft" as PaymentConnectionStatus,
    webhook_status: "unknown" as PaymentWebhookStatus,
    secret_ciphertext: enc.ciphertext,
    crypto_scheme: enc.scheme,
    kek_key_id: enc.kekKeyId,
    crypto_key_version: enc.keyVersion,
    secret_hint: secretHint(secrets),
    metadata,
    created_by_email: input.actorEmail,
    updated_by_email: input.actorEmail,
  };
  const { data, error } = await client
    .from("payment_connections")
    .insert(row)
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_ciphertext,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  const created = mapRow(data as PaymentConnectionRow);
  await insertStaffAuditLog(client, {
    actorEmail: input.actorEmail,
    action: "payment_connection.created",
    resource: `payment_connection:${created.id}`,
    details: {
      provider: created.provider,
      mode: created.mode,
      region_id: created.regionId,
    },
  });
  return created;
}

async function fetchConnectionRow(
  client: SupabaseClient,
  id: string,
): Promise<PaymentConnectionRow> {
  const { data, error } = await client
    .from("payment_connections")
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_ciphertext,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as PaymentConnectionRow;
}

async function verifyStripe(secretKey: string): Promise<void> {
  const r = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Stripe verify failed (${r.status}).`);
}

async function verifyPaypal(input: {
  clientId: string;
  clientSecret: string;
  environment: "sandbox" | "live";
}): Promise<void> {
  const base =
    input.environment === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  const basic = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64");
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!tokenRes.ok) {
    throw new Error(`PayPal verify failed (${tokenRes.status}).`);
  }
}

async function verifyPaymongo(secretKey: string): Promise<void> {
  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const r = await fetch("https://api.paymongo.com/v1/webhooks", {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`PayMongo verify failed (${r.status}).`);
}

/** Probe Maya (PayMaya) Invoice API; 401/403 means invalid secret. */
async function verifyMaya(secretKey: string, mode: PaymentConnectionMode): Promise<void> {
  const base =
    mode === "production"
      ? "https://pg.paymaya.com"
      : "https://pg-sandbox.paymaya.com";
  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const r = await fetch(
    `${base}/invoice/v2/invoices/${encodeURIComponent("__admin_verify_probe__")}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (r.status === 401 || r.status === 403) {
    throw new Error(`Maya verify failed (${r.status}).`);
  }
}

/** Lightweight Aftership API probe (courier list requires a valid API key). */
async function verifyAftership(apiKey: string): Promise<void> {
  const r = await fetch("https://api.aftership.com/v4/couriers", {
    headers: {
      "aftership-api-key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Aftership verify failed (${r.status}).`);
}

async function verifySecrets(
  provider: PaymentProvider,
  mode: PaymentConnectionMode,
  secrets: ProviderSecrets,
): Promise<{ webhookStatus: PaymentWebhookStatus }> {
  if (secrets.provider !== provider) {
    throw new Error("Payment connection provider does not match stored secrets.");
  }
  switch (secrets.provider) {
    case "cod":
      return { webhookStatus: "unknown" };
    case "stripe": {
      await verifyStripe(secrets.secretKey);
      return { webhookStatus: secrets.webhookSecret ? "healthy" : "unknown" };
    }
    case "paypal": {
      await verifyPaypal({
        clientId: secrets.clientId,
        clientSecret: secrets.clientSecret,
        environment: secrets.environment ?? (mode === "production" ? "live" : "sandbox"),
      });
      return { webhookStatus: secrets.webhookId ? "healthy" : "unknown" };
    }
    case "paymongo": {
      await verifyPaymongo(secrets.secretKey);
      return { webhookStatus: secrets.webhookSecret ? "healthy" : "unknown" };
    }
    case "maya": {
      await verifyMaya(secrets.secretKey, mode);
      return { webhookStatus: secrets.webhookSecret ? "healthy" : "unknown" };
    }
    case "aftership": {
      await verifyAftership(secrets.apiKey);
      return { webhookStatus: secrets.webhookSecret ? "healthy" : "unknown" };
    }
    default: {
      const _exhaustive: never = secrets;
      return _exhaustive;
    }
  }
}

export async function verifyPaymentConnection(
  client: SupabaseClient,
  input: { id: string; actorEmail: string; enableAfterVerify?: boolean },
): Promise<{ connection: PaymentConnectionSafe; verificationMessage: string }> {
  const row = await fetchConnectionRow(client, input.id);
  const provider = parseProvider(row.provider);
  const mode = parseMode(row.mode);
  const secrets = await decryptSecretsWithAudit(client, row, {
    actorEmail: input.actorEmail,
    purpose: "verify_payment_connection",
  });
  const verified = await verifySecrets(provider, mode, secrets);
  const now = new Date().toISOString();
  const status: PaymentConnectionStatus = input.enableAfterVerify
    ? "enabled"
    : mode === "sandbox"
      ? "sandbox_verified"
      : "enabled";
  const message =
    mode === "sandbox"
      ? "Connection verified in sandbox mode."
      : "Connection verified and enabled for checkout.";
  const { data, error } = await client
    .from("payment_connections")
    .update({
      status,
      webhook_status: verified.webhookStatus,
      last_verified_at: now,
      last_test_result: message,
      updated_by_email: input.actorEmail,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_ciphertext,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return { connection: mapRow(data as PaymentConnectionRow), verificationMessage: message };
}

export async function markPaymentConnectionVerificationFailed(
  client: SupabaseClient,
  input: { id: string; actorEmail: string; message: string },
): Promise<PaymentConnectionSafe> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("payment_connections")
    .update({
      status: "verification_failed",
      webhook_status: "failing",
      last_test_result: input.message.slice(0, 400),
      updated_by_email: input.actorEmail,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_ciphertext,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return mapRow(data as PaymentConnectionRow);
}

export async function disablePaymentConnection(
  client: SupabaseClient,
  input: { id: string; actorEmail: string },
): Promise<PaymentConnectionSafe> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("payment_connections")
    .update({
      status: "disabled",
      updated_by_email: input.actorEmail,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_ciphertext,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return mapRow(data as PaymentConnectionRow);
}

export async function runPaymentConnectionTest(
  client: SupabaseClient,
  input: { id: string; actorEmail: string },
): Promise<{ connection: PaymentConnectionSafe; result: string }> {
  const row = await fetchConnectionRow(client, input.id);
  const provider = parseProvider(row.provider);
  const mode = parseMode(row.mode);
  const secrets = await decryptSecretsWithAudit(client, row, {
    actorEmail: input.actorEmail,
    purpose: "test_payment_connection",
  });
  const verified = await verifySecrets(provider, mode, secrets);
  const now = new Date().toISOString();
  const result = "Test payment readiness check passed.";
  const { data, error } = await client
    .from("payment_connections")
    .update({
      last_test_result: result,
      webhook_status: verified.webhookStatus,
      updated_by_email: input.actorEmail,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_ciphertext,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return { connection: mapRow(data as PaymentConnectionRow), result };
}

export async function rotatePaymentConnection(
  client: SupabaseClient,
  input: {
    id: string;
    actorEmail: string;
    secrets?: unknown;
  },
): Promise<PaymentConnectionSafe> {
  const row = await fetchConnectionRow(client, input.id);
  const provider = parseProvider(row.provider);
  const newSecrets =
    input.secrets !== undefined
      ? parseSecrets(provider, input.secrets)
      : await decryptSecretsWithAudit(client, row, {
          actorEmail: input.actorEmail,
          purpose: "rotate_payment_connection_rekey",
        });
  const enc = await encryptJsonEnvelope(newSecrets);
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("payment_connections")
    .update({
      secret_ciphertext: enc.ciphertext,
      crypto_scheme: enc.scheme,
      kek_key_id: enc.kekKeyId,
      crypto_key_version: enc.keyVersion,
      secret_rotated_at: now,
      secret_hint: secretHint(newSecrets),
      updated_by_email: input.actorEmail,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_ciphertext,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  await insertStaffAuditLog(client, {
    actorEmail: input.actorEmail,
    action: "payment_connection.secret_rotate",
    resource: `payment_connection:${input.id}`,
    details: {
      provider: row.provider,
      replaced_credentials: input.secrets !== undefined,
      crypto_scheme: enc.scheme,
    },
  });
  return mapRow(data as PaymentConnectionRow);
}

export async function resolveActiveConnectionByRegion(
  client: SupabaseClient,
  regionId: string,
): Promise<PaymentConnectionSafe | null> {
  const { data, error } = await client
    .from("payment_connections")
    .select(
      "id,provider,region_id,label,mode,status,webhook_status,last_verified_at,last_test_result,secret_ciphertext,secret_hint,crypto_scheme,kek_key_id,crypto_key_version,secret_rotated_at,metadata,created_by_email,updated_by_email,created_at,updated_at",
    )
    .eq("region_id", regionId)
    .eq("status", "enabled")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as PaymentConnectionRow);
}

/**
 * Webhook URL operators configure at the PSP or courier dashboard.
 * Cash on delivery has no webhook. Aftership uses `/hooks/aftership`, not `/hooks/payment/*`.
 */
export function paymentWebhookUrl(provider: PaymentProvider): string | null {
  if (provider === "cod") return null;
  const base = (
    process.env.NEXT_PUBLIC_MEDUSA_URL?.trim() ||
    process.env.MEDUSA_BACKEND_URL?.trim() ||
    "http://localhost:9000"
  ).replace(/\/$/, "");
  if (provider === "aftership") return `${base}/hooks/aftership`;
  return `${base}/hooks/payment/${provider}`;
}
