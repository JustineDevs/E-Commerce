import { staffSessionAllows } from "@apparel-commerce/database";
import {
  completePaymentRefundAudit,
  enqueueOutboxEvent,
  insertPaymentRefundAudit,
  PAYMENT_OUTBOX_EVENT_TYPES,
  tryCreateSupabaseClient,
} from "@apparel-commerce/platform-data";
import { getServerSession } from "next-auth/next";
import { logAdminApiEvent } from "@/lib/admin-api-log";
import { authOptions } from "@/lib/auth";
import {
  fetchMedusaOrderPaymentsForAdmin,
  refundMedusaPayment,
} from "@/lib/medusa-order-bridge";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(correlationId, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "orders:write")) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await ctx.params;
  if (!orderId?.startsWith("order_")) {
    return correlatedJson(correlationId, { error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    payment_id?: string;
    amount_minor?: number;
    note?: string;
  };

  const payments = await fetchMedusaOrderPaymentsForAdmin(orderId);
  if (payments.length === 0) {
    return correlatedJson(
      correlationId,
      { error: "No payments found for this order" },
      { status: 404 },
    );
  }

  const paymentId =
    typeof body.payment_id === "string" && body.payment_id.trim().length > 0
      ? body.payment_id.trim()
      : payments[0]?.id;
  if (!paymentId) {
    return correlatedJson(correlationId, { error: "No payment id" }, { status: 400 });
  }

  const selected = payments.find((p) => p.id === paymentId);
  if (!selected) {
    return correlatedJson(correlationId, { error: "Payment not on this order" }, { status: 400 });
  }

  const captured =
    selected.captured_amount != null && Number.isFinite(selected.captured_amount)
      ? selected.captured_amount
      : selected.amount;
  const alreadyRefunded =
    selected.refunded_amount != null && Number.isFinite(selected.refunded_amount)
      ? selected.refunded_amount
      : 0;
  const refundable = Math.max(0, captured - alreadyRefunded);

  let amountMinor =
    body.amount_minor != null && Number.isFinite(Number(body.amount_minor))
      ? Math.floor(Number(body.amount_minor))
      : refundable;
  if (amountMinor <= 0) {
    return correlatedJson(
      correlationId,
      { error: "Nothing to refund for this payment" },
      { status: 400 },
    );
  }
  if (amountMinor > refundable) {
    return correlatedJson(
      correlationId,
      {
        error: `Amount exceeds refundable balance (${refundable} minor units).`,
      },
      { status: 400 },
    );
  }

  logAdminApiEvent({
    route: "POST /api/admin/orders/[orderId]/refund",
    correlationId,
    phase: "start",
    detail: { orderId, paymentId, amountMinor },
  });

  const sb = tryCreateSupabaseClient();
  let refundAuditId: string | null = null;
  if (sb) {
    refundAuditId = await insertPaymentRefundAudit(sb, {
      medusaOrderId: orderId,
      medusaPaymentId: paymentId,
      amountMinor,
      actorEmail: typeof session.user.email === "string" ? session.user.email : null,
      note: typeof body.note === "string" ? body.note : null,
      requestCorrelationId: correlationId,
    }).catch(() => null);
    await enqueueOutboxEvent(sb, {
      aggregate_type: "payment_refund",
      aggregate_id: orderId,
      event_type: PAYMENT_OUTBOX_EVENT_TYPES.PAYMENT_ATTEMPT_REFUND_REQUESTED,
      payload: {
        order_id: orderId,
        payment_id: paymentId,
        amount_minor: amountMinor,
        actor_email:
          typeof session.user.email === "string" ? session.user.email : null,
        note: typeof body.note === "string" ? body.note : null,
        request_correlation_id: correlationId,
        refund_audit_id: refundAuditId,
      },
    }).catch(() => {});
  }

  const result = await refundMedusaPayment(
    paymentId,
    amountMinor,
    typeof body.note === "string" ? body.note : undefined,
  );

  if (!result.ok) {
    if (sb && refundAuditId) {
      await completePaymentRefundAudit(sb, refundAuditId, false, result.error ?? "refund_failed").catch(
        () => {},
      );
    }
    logAdminApiEvent({
      route: "POST /api/admin/orders/[orderId]/refund",
      correlationId,
      phase: "error",
      detail: { orderId, error: result.error },
    });
    return correlatedJson(
      correlationId,
      { error: result.error ?? "Refund did not complete" },
      { status: result.status >= 400 ? result.status : 502 },
    );
  }

  if (sb && refundAuditId) {
    await completePaymentRefundAudit(sb, refundAuditId, true, null).catch(() => {});
  }

  logAdminApiEvent({
    route: "POST /api/admin/orders/[orderId]/refund",
    correlationId,
    phase: "ok",
    detail: { orderId, paymentId, amountMinor },
  });

  return correlatedJson(correlationId, {
    ok: true as const,
    payment_id: paymentId,
    amount_minor: amountMinor,
  });
}
