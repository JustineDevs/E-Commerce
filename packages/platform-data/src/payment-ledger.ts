import { randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingTableOrSchemaError } from "./supabase-errors";

export type PaymentAttemptRow = {
  id: string;
  correlation_id: string;
  cart_id: string;
  order_id: string | null;
  provider: string;
  provider_session_id: string | null;
  provider_payment_id: string | null;
  status: string;
  checkout_state: string;
  amount_minor: number | null;
  currency: string | null;
  medusa_payment_session_id: string | null;
  medusa_payment_id: string | null;
  medusa_order_id: string | null;
  last_error: string | null;
  idempotency_key: string | null;
  webhook_last_event_id: string | null;
  webhook_last_status: string | null;
  finalize_attempts: number;
  provider_payload?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
};

const OPEN_STATUSES = new Set([
  "initiated",
  "pending_payment",
  "pending_capture",
  "paid",
  "authorized",
  "pending_provider_redirect",
  "paid_awaiting_order",
  "finalizing_order",
  "awaiting_completion",
  "needs_review",
]);

function isOpenStatus(status: string): boolean {
  return OPEN_STATUSES.has(status);
}

export async function findOpenPaymentAttemptForCart(
  supabase: SupabaseClient,
  cartId: string,
  provider: string,
): Promise<PaymentAttemptRow | null> {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("cart_id", cartId)
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    throw error;
  }
  const rows = (data ?? []) as PaymentAttemptRow[];
  return rows.find((r) => isOpenStatus(r.status)) ?? null;
}

export type RegisterPaymentAttemptInput = {
  cartId: string;
  provider: string;
  amountMinor: number;
  currencyCode: string;
  medusaPaymentSessionId?: string;
  providerSessionId?: string;
  idempotencyKey?: string;
};

export async function registerPaymentAttempt(
  supabase: SupabaseClient,
  input: RegisterPaymentAttemptInput,
): Promise<{ correlationId: string; reused: boolean }> {
  const existing = await findOpenPaymentAttemptForCart(
    supabase,
    input.cartId,
    input.provider,
  );
  if (existing) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      amount_minor: input.amountMinor,
      currency: input.currencyCode.toLowerCase(),
    };
    if (input.medusaPaymentSessionId) {
      patch.medusa_payment_session_id = input.medusaPaymentSessionId;
    }
    if (input.providerSessionId) {
      patch.provider_session_id = input.providerSessionId;
    }
    if (input.idempotencyKey) {
      patch.idempotency_key = input.idempotencyKey;
    }
    const { error } = await supabase
      .from("payment_attempts")
      .update(patch)
      .eq("id", existing.id);
    if (error) throw error;
    return { correlationId: existing.correlation_id, reused: true };
  }

  const correlationId = randomUUID();
  const { error } = await supabase.from("payment_attempts").insert({
    correlation_id: correlationId,
    cart_id: input.cartId,
    provider: input.provider,
    status: "initiated",
    checkout_state: "awaiting_provider",
    amount_minor: input.amountMinor,
    currency: input.currencyCode.toLowerCase(),
    medusa_payment_session_id: input.medusaPaymentSessionId ?? null,
    provider_session_id: input.providerSessionId ?? null,
    idempotency_key: input.idempotencyKey ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return { correlationId, reused: false };
}

export async function findPaymentAttemptByMedusaOrderId(
  supabase: SupabaseClient,
  medusaOrderId: string,
): Promise<PaymentAttemptRow | null> {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("medusa_order_id", medusaOrderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    throw error;
  }
  return (data as PaymentAttemptRow) ?? null;
}

export async function getPaymentAttemptByCorrelationId(
  supabase: SupabaseClient,
  correlationId: string,
): Promise<PaymentAttemptRow | null> {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("correlation_id", correlationId)
    .maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    throw error;
  }
  return (data as PaymentAttemptRow) ?? null;
}

export async function updatePaymentAttemptByCorrelationId(
  supabase: SupabaseClient,
  correlationId: string,
  patch: Partial<
    Pick<
      PaymentAttemptRow,
      | "status"
      | "checkout_state"
      | "medusa_order_id"
      | "last_error"
      | "finalize_attempts"
      | "order_id"
      | "provider_payment_id"
      | "webhook_last_event_id"
      | "webhook_last_status"
      | "provider_payload"
    >
  > & { finalized_at?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("payment_attempts")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("correlation_id", correlationId);
  if (error) throw error;
}

export async function mergePaymentAttemptProviderPayload(
  supabase: SupabaseClient,
  correlationId: string,
  merge: Record<string, unknown>,
): Promise<void> {
  const row = await getPaymentAttemptByCorrelationId(supabase, correlationId);
  if (!row) return;
  const prev =
    row.provider_payload && typeof row.provider_payload === "object"
      ? (row.provider_payload as Record<string, unknown>)
      : {};
  await updatePaymentAttemptByCorrelationId(supabase, correlationId, {
    provider_payload: { ...prev, ...merge },
  });
}

export async function mergePaymentAttemptPayloadByMedusaOrderId(
  supabase: SupabaseClient,
  medusaOrderId: string,
  merge: Record<string, unknown>,
): Promise<void> {
  const row = await findPaymentAttemptByMedusaOrderId(supabase, medusaOrderId);
  if (!row) return;
  await mergePaymentAttemptProviderPayload(supabase, row.correlation_id, merge);
}

export async function incrementFinalizeAttempts(
  supabase: SupabaseClient,
  correlationId: string,
): Promise<void> {
  const row = await getPaymentAttemptByCorrelationId(supabase, correlationId);
  if (!row) return;
  await updatePaymentAttemptByCorrelationId(supabase, correlationId, {
    finalize_attempts: (row.finalize_attempts ?? 0) + 1,
    checkout_state: "finalizing_order",
    status: "finalizing_order",
  });
}

export async function listStuckPaymentAttempts(
  supabase: SupabaseClient,
  limit: number,
): Promise<PaymentAttemptRow[]> {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .in("status", ["paid_awaiting_order", "finalizing_order"])
    .is("medusa_order_id", null)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as PaymentAttemptRow[];
}

/** Alias for reconciliation jobs and operator docs (stale = paid but no order id). */
export const listStalePaymentAttempts = listStuckPaymentAttempts;

export async function listRecentPaymentAttempts(
  supabase: SupabaseClient,
  limit: number,
): Promise<PaymentAttemptRow[]> {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(Math.min(500, Math.max(1, limit)));
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as PaymentAttemptRow[];
}

export async function countPaymentAttemptsByStatuses(
  supabase: SupabaseClient,
  statuses: string[],
): Promise<number> {
  if (statuses.length === 0) return 0;
  const { count, error } = await supabase
    .from("payment_attempts")
    .select("*", { count: "exact", head: true })
    .in("status", statuses);
  if (error) {
    if (isMissingTableOrSchemaError(error)) return 0;
    throw error;
  }
  return count ?? 0;
}
