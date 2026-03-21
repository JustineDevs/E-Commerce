import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertOAuthUser(
  supabase: SupabaseClient,
  input: { email: string; name?: string | null; image?: string | null; googleSub: string },
  opts: { promoteEmails: string[] }
): Promise<{ role: string }> {
  const { data: row } = await supabase.from("users").select("role").eq("email", input.email).maybeSingle();
  let role = (row?.role as string) ?? "customer";
  if (row?.role === "admin" || row?.role === "staff") {
    role = row.role as string;
  } else if (opts.promoteEmails.includes(input.email)) {
    role = "staff";
  }

  const { error } = await supabase.from("users").upsert(
    {
      email: input.email,
      name: input.name,
      image: input.image,
      google_sub: input.googleSub,
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
  if (error) throw error;

  const { data: out } = await supabase.from("users").select("role").eq("email", input.email).single();
  return { role: (out?.role as string) ?? role };
}

export function isStaffRole(role: string): boolean {
  return role === "admin" || role === "staff";
}
