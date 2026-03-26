import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";

export type CmsAbExperimentRow = {
  id: string;
  experiment_key: string;
  name: string;
  variants: unknown;
  active: boolean;
  updated_at: string;
};

export async function listCmsAbExperiments(supabase: SupabaseClient): Promise<CmsAbExperimentRow[]> {
  const { data, error } = await supabase
    .from("cms_ab_experiments")
    .select("*")
    .order("experiment_key");
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    console.error("[cms-experiments] list", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x.id),
      experiment_key: String(x.experiment_key ?? ""),
      name: String(x.name ?? ""),
      variants: x.variants ?? [],
      active: Boolean(x.active),
      updated_at: String(x.updated_at ?? ""),
    };
  });
}

export async function upsertCmsAbExperiment(
  supabase: SupabaseClient,
  input: {
    id?: string;
    experiment_key: string;
    name?: string;
    variants: unknown;
    active?: boolean;
  },
): Promise<CmsAbExperimentRow | null> {
  const row = {
    experiment_key: input.experiment_key,
    name: input.name ?? "",
    variants: input.variants ?? [],
    active: input.active ?? false,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { data, error } = await supabase
      .from("cms_ab_experiments")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) {
      console.error("[cms-experiments] update", error.message);
      return null;
    }
    const x = data as Record<string, unknown>;
    return {
      id: String(x.id),
      experiment_key: String(x.experiment_key ?? ""),
      name: String(x.name ?? ""),
      variants: x.variants ?? [],
      active: Boolean(x.active),
      updated_at: String(x.updated_at ?? ""),
    };
  }
  const { data, error } = await supabase
    .from("cms_ab_experiments")
    .upsert(row, { onConflict: "experiment_key" })
    .select("*")
    .single();
  if (error) {
    console.error("[cms-experiments] insert", error.message);
    return null;
  }
  const x = data as Record<string, unknown>;
  return {
    id: String(x.id),
    experiment_key: String(x.experiment_key ?? ""),
    name: String(x.name ?? ""),
    variants: x.variants ?? [],
    active: Boolean(x.active),
    updated_at: String(x.updated_at ?? ""),
  };
}
