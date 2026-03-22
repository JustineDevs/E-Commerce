import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertOAuthUser(
  supabase: SupabaseClient,
  input: { email: string; name?: string | null; image?: string | null; googleSub: string },
  opts: { promoteEmails: string[] }
): Promise<{ role: string }> {
  // Upsert user (identity only; no role, no google_sub in users table)
  const { data: user, error: uErr } = await supabase
    .from("users")
    .upsert(
      {
        email: input.email,
        name: input.name,
        image: input.image,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();
  if (uErr) throw uErr;
  if (!user) throw new Error("Failed to upsert user");

  const userId = user.id as string;

  // Upsert oauth_accounts (google_sub moved here)
  const { error: oaErr } = await supabase
    .from("oauth_accounts")
    .upsert(
      {
        user_id: userId,
        provider: "google",
        provider_account_id: input.googleSub,
      },
      { onConflict: "provider,provider_account_id" }
    );
  if (oaErr) throw oaErr;

  // Resolve role: check user_roles first, else promoteEmails
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  let role = (roleRow?.role as string) ?? "customer";
  if (roleRow?.role === "admin" || roleRow?.role === "staff") {
    role = roleRow.role as string;
  } else if (opts.promoteEmails.includes(input.email)) {
    role = "staff";
    await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "staff" }, { onConflict: "user_id" });
  } else if (!roleRow) {
    await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "customer" }, { onConflict: "user_id" });
  }

  return { role };
}

export function isStaffRole(role: string): boolean {
  return role === "admin" || role === "staff";
}

export type StaffCheckSession = { user?: { role?: string } } | null;

export function checkStaffRole(session: StaffCheckSession):
  | { ok: true }
  | { ok: false; status: 401; code: "NO_SESSION" }
  | { ok: false; status: 403; code: "NOT_STAFF" } {
  if (!session?.user) {
    return { ok: false, status: 401, code: "NO_SESSION" };
  }
  const role = session.user.role;
  if (role !== "admin" && role !== "staff") {
    return { ok: false, status: 403, code: "NOT_STAFF" };
  }
  return { ok: true };
}
