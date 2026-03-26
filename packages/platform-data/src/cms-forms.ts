import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";

export const CMS_FORM_KEYS = ["contact", "newsletter", "lead"] as const;
export type CmsFormKey = (typeof CMS_FORM_KEYS)[number];

export type CmsFormSubmissionRow = {
  id: string;
  form_key: string;
  payload: Record<string, unknown>;
  created_at: string;
  ip_hash: string | null;
};

export async function listCmsFormSubmissions(
  supabase: SupabaseClient,
  limit = 200,
): Promise<CmsFormSubmissionRow[]> {
  const { data, error } = await supabase
    .from("cms_form_submissions")
    .select("id, form_key, payload, created_at, ip_hash")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    console.error("[cms-forms] list", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x.id),
      form_key: String(x.form_key ?? ""),
      payload: (x.payload && typeof x.payload === "object" ? x.payload : {}) as Record<
        string,
        unknown
      >,
      created_at: String(x.created_at ?? ""),
      ip_hash: x.ip_hash != null ? String(x.ip_hash) : null,
    };
  });
}

export async function insertCmsFormSubmission(
  supabase: SupabaseClient,
  input: { form_key: CmsFormKey | string; payload: Record<string, unknown>; ip_hash?: string | null },
): Promise<boolean> {
  const { error } = await supabase.from("cms_form_submissions").insert({
    form_key: input.form_key,
    payload: input.payload,
    ip_hash: input.ip_hash ?? null,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[cms-forms] insert", error.message);
    return false;
  }
  return true;
}
