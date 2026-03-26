import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";

export type CampaignType =
  | "winback"
  | "birthday"
  | "first_purchase"
  | "upsell"
  | "custom";

export type Campaign = {
  id: string;
  name: string;
  type: CampaignType;
  segment_id: string | null;
  subject: string | null;
  body_template: string | null;
  channel: "email";
  is_active: boolean;
  last_run_at: string | null;
  schedule_cron: string | null;
  created_at: string;
};

function rowToCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    type: (row.type as CampaignType) ?? "custom",
    segment_id: row.segment_id != null ? String(row.segment_id) : null,
    subject: row.subject != null ? String(row.subject) : null,
    body_template: row.body_template != null ? String(row.body_template) : null,
    channel: "email",
    is_active: Boolean(row.is_active ?? true),
    last_run_at: row.last_run_at != null ? String(row.last_run_at) : null,
    schedule_cron:
      row.schedule_cron != null ? String(row.schedule_cron) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function listCampaigns(
  supabase: SupabaseClient,
  opts?: { type?: CampaignType },
): Promise<Campaign[]> {
  let q = supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.type) {
    q = q.eq("type", opts.type);
  }
  const { data, error } = await q;
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []).map((r) => rowToCampaign(r as Record<string, unknown>));
}

export async function createCampaign(
  supabase: SupabaseClient,
  input: {
    name: string;
    type: CampaignType;
    segment_id?: string;
    subject?: string;
    body_template?: string;
    schedule_cron?: string;
  },
): Promise<Campaign> {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: input.name,
      type: input.type,
      segment_id: input.segment_id ?? null,
      subject: input.subject ?? null,
      body_template: input.body_template ?? null,
      channel: "email",
      schedule_cron: input.schedule_cron ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToCampaign(data as Record<string, unknown>);
}

export async function updateCampaign(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{
    name: string;
    subject: string;
    body_template: string;
    is_active: boolean;
    schedule_cron: string;
    segment_id: string;
  }>,
): Promise<Campaign> {
  const { data, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToCampaign(data as Record<string, unknown>);
}

export type CampaignMessage = {
  id: string;
  campaign_id: string;
  recipient_email: string;
  sent_at: string;
  status: string;
};

export async function recordCampaignMessage(
  supabase: SupabaseClient,
  input: {
    campaign_id: string;
    recipient_email: string;
    status?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("campaign_messages").insert({
    campaign_id: input.campaign_id,
    recipient_email: input.recipient_email,
    status: input.status ?? "sent",
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}

export async function executeCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  sendEmail: (to: string, subject: string, html: string) => Promise<void>,
): Promise<number> {
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (campErr) throw campErr;
  if (!campaign.segment_id) throw new Error("Campaign has no segment");

  const { data: members, error: memErr } = await supabase
    .from("customer_segment_members")
    .select("customer_email")
    .eq("segment_id", campaign.segment_id);
  if (memErr) throw memErr;

  let sent = 0;
  for (const member of members ?? []) {
    try {
      await sendEmail(
        String(member.customer_email),
        String(campaign.subject ?? campaign.name),
        String(campaign.body_template ?? ""),
      );
      await recordCampaignMessage(supabase, {
        campaign_id: campaignId,
        recipient_email: String(member.customer_email),
        status: "sent",
      });
      sent++;
    } catch {
      await recordCampaignMessage(supabase, {
        campaign_id: campaignId,
        recipient_email: String(member.customer_email),
        status: "failed",
      });
    }
  }

  await supabase
    .from("campaigns")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", campaignId);

  return sent;
}
