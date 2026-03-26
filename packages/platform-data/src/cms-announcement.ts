import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";

const DEFAULT_ID = "default";

export type CmsAnnouncementRow = {
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  dismissible: boolean;
  startsAt: string | null;
  endsAt: string | null;
  locale: string;
};

export async function getCmsAnnouncement(supabase: SupabaseClient): Promise<CmsAnnouncementRow | null> {
  const { data, error } = await supabase.from("cms_announcement").select("*").eq("id", DEFAULT_ID).maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    console.error("[cms-announcement] getCmsAnnouncement", error.message);
    return null;
  }
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    body: String(r.body ?? ""),
    linkUrl: r.link_url != null ? String(r.link_url) : null,
    linkLabel: r.link_label != null ? String(r.link_label) : null,
    dismissible: Boolean(r.dismissible),
    startsAt: r.starts_at != null ? String(r.starts_at) : null,
    endsAt: r.ends_at != null ? String(r.ends_at) : null,
    locale: String(r.locale ?? "en"),
  };
}

export async function upsertCmsAnnouncement(
  supabase: SupabaseClient,
  row: Partial<CmsAnnouncementRow> & { body?: string },
): Promise<void> {
  const existing = await getCmsAnnouncement(supabase);
  const { error } = await supabase.from("cms_announcement").upsert(
    {
      id: DEFAULT_ID,
      body: row.body ?? existing?.body ?? "",
      link_url: row.linkUrl !== undefined ? row.linkUrl : existing?.linkUrl ?? null,
      link_label: row.linkLabel !== undefined ? row.linkLabel : existing?.linkLabel ?? null,
      dismissible: row.dismissible ?? existing?.dismissible ?? true,
      starts_at: row.startsAt !== undefined ? row.startsAt : existing?.startsAt ?? null,
      ends_at: row.endsAt !== undefined ? row.endsAt : existing?.endsAt ?? null,
      locale: row.locale ?? existing?.locale ?? "en",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}
