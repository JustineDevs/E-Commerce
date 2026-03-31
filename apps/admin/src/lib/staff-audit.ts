import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminApiEvent } from "@/lib/admin-api-log";

export type AuditLogInput = {
  actorEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

/**
 * Writes to existing `public.audit_logs` (seed / platform schema).
 * Includes before/after snapshots for sensitive actions.
 * Failures are logged; they do not fail the calling HTTP handler.
 */
export async function insertStaffAuditLog(
  client: SupabaseClient,
  input: AuditLogInput,
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
    ...(input.resourceId ? { resource_id: input.resourceId } : {}),
    ...(input.before ? { snapshot_before: input.before } : {}),
    ...(input.after ? { snapshot_after: input.after } : {}),
    timestamp: new Date().toISOString(),
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

export function diffSnapshot(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }
  return changes;
}
