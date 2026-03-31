import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  getReceiptByOrder,
  saveReceipt,
  markReceiptSent,
  buildReceiptHtml,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { sendResendTransactionalEmail } from "@apparel-commerce/resend-mail";
import { correlatedJson } from "@/lib/staff-api-response";

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "receipts:read")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return correlatedJson(cid, { error: "order_id is required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const receipt = await getReceiptByOrder(sb, orderId);
  if (!receipt) return correlatedJson(cid, { error: "Not found" }, { status: 404 });
  return correlatedJson(cid, { data: receipt });
}

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  if (!staffSessionAllows(session, "receipts:send")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.order_id || !body.items || !body.total) {
    return correlatedJson(cid, { error: "order_id, items, and total are required" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;
  const html = buildReceiptHtml({
    id: body.order_id,
    display_id: body.display_id,
    items: body.items,
    total: body.total,
    currency_code: body.currency_code ?? "php",
    created_at: body.created_at,
    storeName: body.store_name,
  });
  const receipt = await saveReceipt(sb, {
    order_id: body.order_id,
    customer_email: body.customer_email,
    receipt_html: html,
  });

  if (body.customer_email && body.send) {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const fromAddr =
      process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.RESEND_FROM?.trim() ||
      "noreply@apparel-commerce.com";
    if (resendKey) {
      const sent = await sendResendTransactionalEmail({
        apiKey: resendKey,
        from: fromAddr,
        to: String(body.customer_email),
        subject: `Your receipt for Order #${body.display_id ?? body.order_id}`,
        html,
        tags: [{ name: "type", value: "staff_receipt" }],
      });
      if (!sent.ok) {
        return correlatedJson(
          cid,
          { error: "Failed to send receipt email", detail: sent.message },
          { status: 502 },
        );
      }
      await markReceiptSent(sb, receipt.id);
    }
  }

  return correlatedJson(cid, { data: receipt }, { status: 201 });
}
