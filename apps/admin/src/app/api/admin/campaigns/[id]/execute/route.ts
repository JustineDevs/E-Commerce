import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import {
  executeCampaign,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";
import { Resend } from "resend";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffHasPermission(session.user.permissions ?? [], "campaigns:execute")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return correlatedJson(cid, { error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const resend = new Resend(resendKey);
  const fromAddr = process.env.RESEND_FROM ?? "noreply@apparel-commerce.com";

  const sendEmail = async (to: string, subject: string, html: string) => {
    await resend.emails.send({ from: fromAddr, to, subject, html });
  };

  const sentCount = await executeCampaign(sb, id, sendEmail);
  return correlatedJson(cid, { sent: sentCount });
}
