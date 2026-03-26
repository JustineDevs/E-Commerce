import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "@apparel-commerce/platform-data";
import type { AdminOperationResult } from "@/lib/admin-operation-result";
import { adminErr, adminOk } from "@/lib/admin-operation-result";

/** Operational workflow states (Supabase overlay; Medusa holds commerce status). */
export const WORKFLOW_STATES = [
  "draft",
  "pending_review",
  "approved",
  "scheduled",
  "published",
  "archived",
  "failed",
  "canceled",
] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];

export type EntityWorkflowType =
  | "catalog_product"
  | "sales_order"
  | "inventory_adjustment"
  | "campaign"
  | "cms_page";

const ALLOWED: Record<string, Set<string>> = {
  draft: new Set([
    "pending_review",
    "published",
    "archived",
    "failed",
    "canceled",
  ]),
  pending_review: new Set(["draft", "approved", "canceled", "failed"]),
  approved: new Set(["scheduled", "published", "draft", "failed"]),
  scheduled: new Set(["published", "draft", "canceled"]),
  published: new Set(["archived", "draft", "failed"]),
  archived: new Set(["draft"]),
  failed: new Set(["draft", "pending_review"]),
  canceled: new Set([]),
};

export function isAllowedTransition(from: string, to: string): boolean {
  const next = ALLOWED[from];
  return next ? next.has(to) : false;
}

export async function upsertEntityWorkflow(
  client: SupabaseClient,
  input: {
    entityType: EntityWorkflowType;
    entityId: string;
    state: string;
    previousState?: string | null;
    notes?: string | null;
    actorEmail?: string | null;
  },
): Promise<AdminOperationResult<{ id: string }>> {
  const { data, error } = await client
    .from("admin_entity_workflow")
    .upsert(
      {
        entity_type: input.entityType,
        entity_id: input.entityId,
        state: input.state,
        previous_state: input.previousState ?? null,
        notes: input.notes ?? null,
        actor_email: input.actorEmail ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id", ignoreDuplicates: false },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return adminErr("WORKFLOW_DB", error.message, 502);
  }
  const id = data?.id;
  if (!id) {
    return adminErr("WORKFLOW_DB", "Upsert returned no id", 502);
  }
  return adminOk({ id: String(id) });
}

export type EntityWorkflowRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  state: string;
  previous_state: string | null;
  notes: string | null;
  actor_email: string | null;
  updated_at: string;
};

/**
 * Recent workflow rows for compliance and ops review (Supabase overlay).
 */
export async function listEntityWorkflows(
  client: SupabaseClient,
  opts?: { limit?: number; offset?: number; entityType?: string },
): Promise<EntityWorkflowRow[]> {
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));
  const offset = Math.max(0, opts?.offset ?? 0);
  let q = client
    .from("admin_entity_workflow")
    .select(
      "id,entity_type,entity_id,state,previous_state,notes,actor_email,updated_at",
    )
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts?.entityType) {
    q = q.eq("entity_type", opts.entityType);
  }
  const { data, error } = await q;
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      entity_type: String(r.entity_type ?? ""),
      entity_id: String(r.entity_id ?? ""),
      state: String(r.state ?? ""),
      previous_state:
        r.previous_state != null ? String(r.previous_state) : null,
      notes: r.notes != null ? String(r.notes) : null,
      actor_email: r.actor_email != null ? String(r.actor_email) : null,
      updated_at:
        typeof r.updated_at === "string"
          ? r.updated_at
          : new Date().toISOString(),
    };
  });
}

export async function getEntityWorkflow(
  client: SupabaseClient,
  entityType: EntityWorkflowType,
  entityId: string,
): Promise<{
  state: string;
  previous_state: string | null;
  notes: string | null;
  updated_at: string;
} | null> {
  const { data, error } = await client
    .from("admin_entity_workflow")
    .select("state,previous_state,notes,updated_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    state: String(row.state ?? "draft"),
    previous_state:
      row.previous_state != null ? String(row.previous_state) : null,
    notes: row.notes != null ? String(row.notes) : null,
    updated_at:
      typeof row.updated_at === "string"
        ? row.updated_at
        : new Date().toISOString(),
  };
}

export async function transitionEntityWorkflow(
  client: SupabaseClient,
  input: {
    entityType: EntityWorkflowType;
    entityId: string;
    toState: string;
    actorEmail: string;
    notes?: string | null;
  },
): Promise<AdminOperationResult<{ state: string }>> {
  const current = await getEntityWorkflow(
    client,
    input.entityType,
    input.entityId,
  );
  const from = current?.state ?? "draft";
  if (!isAllowedTransition(from, input.toState)) {
    return adminErr(
      "WORKFLOW_TRANSITION",
      `Cannot transition from ${from} to ${input.toState}`,
      400,
    );
  }
  const res = await upsertEntityWorkflow(client, {
    entityType: input.entityType,
    entityId: input.entityId,
    state: input.toState,
    previousState: from,
    notes: input.notes ?? null,
    actorEmail: input.actorEmail,
  });
  if (!res.ok) return res;
  return adminOk({ state: input.toState });
}
