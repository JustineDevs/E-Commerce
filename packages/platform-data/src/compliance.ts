import type { SupabaseClient } from "@supabase/supabase-js";

export type DataSubjectExport = {
  user: unknown;
  addresses: unknown[];
  orders: unknown[];
  orderItems: unknown[];
  payments: unknown[];
};

/**
 * Export data subject by email. Users table only; orders/addresses/payments
 * live in Medusa. Returns user record + empty arrays for commerce data.
 * Creates compliance_requests record for audit.
 */
export async function exportDataSubjectByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<DataSubjectExport | null> {
  const { data: user, error: uErr } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (uErr) throw uErr;
  if (!user) return null;

  const requestId = crypto.randomUUID();
  await supabase.from("compliance_requests").insert({
    id: requestId,
    type: "dsar_export",
    requestor_email: email,
    status: "completed",
  });

  return {
    user,
    addresses: [],
    orders: [],
    orderItems: [],
    payments: [],
  };
}

/**
 * Retention anonymization. Addresses/orders dropped from Supabase;
 * Medusa owns commerce. No-op returning zero.
 */
export async function anonymizeStaleOrderAddresses(
  supabase: SupabaseClient,
  olderThanIso: string
): Promise<{ addressesUpdated: number }> {
  void supabase;
  void olderThanIso;
  return { addressesUpdated: 0 };
}
