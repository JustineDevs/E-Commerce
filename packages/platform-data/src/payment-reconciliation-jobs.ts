import type { SupabaseClient } from "@supabase/supabase-js";

import { enqueueJob } from "./background-jobs";

/** Job payloads for worker / cron; use with `background_jobs.job_type`. */
export const PAYMENT_RECONCILIATION_JOB_TYPES = {
  FINALIZE_CHECKOUT: "finalize_checkout",
  RECONCILE_PAYMENT: "reconcile_payment",
  CAPTURE_COD_PAYMENT: "capture_cod_payment",
  REFUND_PAYMENT: "refund_payment",
  REPAIR_PAYMENT_ATTEMPT: "repair_payment_attempt",
} as const;

/**
 * Enqueue a payment reconciliation or follow-up job (durable `background_jobs` row).
 */
export async function enqueueReconciliationJob(
  supabase: SupabaseClient,
  jobType: (typeof PAYMENT_RECONCILIATION_JOB_TYPES)[keyof typeof PAYMENT_RECONCILIATION_JOB_TYPES],
  payload: Record<string, unknown>,
  createdBy?: string,
): Promise<string | null> {
  return enqueueJob(supabase, jobType, payload, createdBy);
}
