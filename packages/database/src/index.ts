import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL");

  if (process.env.NODE_ENV === "production") {
    if (!serviceKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is required in production (anon key bypass is disabled)",
      );
    }
    return createClient(url, serviceKey);
  }

  if (!serviceKey && !anonKey) {
    throw new Error("Missing Supabase credentials (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)");
  }
  if (!serviceKey) {
    console.warn("[database] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key (dev only)");
  }
  return createClient(url, serviceKey ?? anonKey!);
}

export { upsertOAuthUser, isStaffRole } from "./queries/admin-users";
export { exportDataSubjectByEmail, anonymizeStaleOrderAddresses } from "./queries/compliance";
