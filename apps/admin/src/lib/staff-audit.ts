import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminApiEvent } from "@/lib/admin-api-log";

/**
 * Writes to existing `public.audit_logs` (seed / platform schema).
 * Failures are logged; they do not fail the calling HTTP handler.
 */
export async function insertStaffAuditLog(
  client: SupabaseClient,
  input: {
    actorEmail: string;
    action: string;
    resource: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  let actorId: string | null = null;
  try {
    const { data: user } = await client
      .from("users")
      .select("id")
      .eq("email", input.actorEmail)
      .maybeSingle();
    actorId = (user?.id as string | undefined) ?? null;
  } catch {
    actorId = null;
  }

  const details = {
    ...(input.details ?? {}),
    actor_email: input.actorEmail,
  };

  const { error } = await client.from("audit_logs").insert({
    action: input.action,
    actor_id: actorId,
    resource: input.resource,
    details,
  });

  if (error) {
    logAdminApiEvent({
      route: "insertStaffAuditLog",
      correlationId: "audit",
      phase: "error",
      detail: { message: error.message },
    });
  }
}
