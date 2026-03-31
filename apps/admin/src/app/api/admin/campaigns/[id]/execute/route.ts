import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  executeCampaign,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";
import { sendResendTransactionalEmail } from "@apparel-commerce/resend-mail";
import { validateCampaignAgainstMedusaPromotions } from "@/lib/campaign-medusa-governance";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "campaigns:execute")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const { data: campRow } = await sb
    .from("campaigns")
    .select("subject,body_template")
    .eq("id", id)
    .maybeSingle();
  const gov = await validateCampaignAgainstMedusaPromotions({
    bodyTemplate: String(campRow?.body_template ?? ""),
    subject: String(campRow?.subject ?? ""),
  });
  if (!gov.ok) {
    return correlatedJson(
      cid,
      {
        error: "Campaign copy references codes not present in Medusa promotions",
        governance: gov,
      },
      { status: 409 },
    );
  }
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return correlatedJson(cid, { error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const fromAddr =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "noreply@apparel-commerce.com";

  const sendEmail = async (to: string, subject: string, html: string) => {
    const sent = await sendResendTransactionalEmail({
      apiKey: resendKey,
      from: fromAddr,
      to,
      subject,
      html,
      tags: [{ name: "type", value: "campaign" }],
    });
    if (!sent.ok) {
      throw new Error(sent.message);
    }
  };

  const sentCount = await executeCampaign(sb, id, sendEmail);
  return correlatedJson(cid, { sent: sentCount });
}
