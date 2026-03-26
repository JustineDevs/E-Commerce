import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  PaymentActions,
} from "@medusajs/framework/utils";
import { processPaymentWorkflow } from "@medusajs/medusa/core-flows";

const MAYA_SANDBOX_API = "https://pg-sandbox.paymaya.com";
const MAYA_PROD_API = "https://pg.paymaya.com";

function basicAuth(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

function getMayaApiBase(sandbox: boolean): string {
  return sandbox ? MAYA_SANDBOX_API : MAYA_PROD_API;
}

type MayaInvoiceJson = {
  status?: string;
  totalAmount?: { value?: string };
};

async function fetchMayaInvoiceCompleted(
  invoiceId: string,
  secretKey: string,
  sandbox: boolean,
): Promise<{ completed: boolean; amountMinor: number }> {
  const apiBase = getMayaApiBase(sandbox);
  const res = await fetch(
    `${apiBase}/invoice/v2/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: "GET",
      headers: {
        Authorization: basicAuth(secretKey),
        Accept: "application/json",
      },
    },
  );
  const text = await res.text();
  if (!res.ok) {
    return { completed: false, amountMinor: 0 };
  }
  let json: MayaInvoiceJson;
  try {
    json = JSON.parse(text) as MayaInvoiceJson;
  } catch {
    return { completed: false, amountMinor: 0 };
  }
  const status = (json.status ?? "").toUpperCase();
  if (status !== "COMPLETED") {
    return { completed: false, amountMinor: 0 };
  }
  const amountStr = json.totalAmount?.value;
  const amountMinor =
    amountStr != null ? Math.round(parseFloat(String(amountStr)) * 100) : 0;
  return {
    completed: true,
    amountMinor: Number.isFinite(amountMinor) ? Math.max(0, amountMinor) : 0,
  };
}

type PaymentSessionRow = {
  id?: string;
  status?: string;
  provider_id?: string;
  data?: Record<string, unknown>;
  created_at?: string | Date;
};

/**
 * Polls gateway state for Maya sessions stuck in `requires_more` / `pending`
 * after checkout (missed webhook). Completes payment via the same workflow as
 * {@link processPaymentWorkflow} when the invoice is paid.
 */
export default async function reconcilePendingPayments({
  container,
}: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    info: (m: string) => void;
    warn: (m: string) => void;
  };
  const minutes = Math.max(1, Number(process.env.MEDUSA_RECONCILE_MINUTES ?? "30"));
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const secretKey = process.env.MAYA_SECRET_KEY?.trim();
  if (!secretKey) {
    logger.warn(
      "[reconcile-pending-payments] MAYA_SECRET_KEY not set — skipping Maya reconciliation.",
    );
    return;
  }

  const sandbox = process.env.MAYA_SANDBOX === "true";

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  let sessions: PaymentSessionRow[] = [];
  try {
    const { data } = await query.graph({
      entity: "payment_session",
      fields: ["id", "status", "provider_id", "data", "created_at"],
      filters: {
        provider_id: { $ilike: "%maya%" },
        created_at: { $lt: cutoff },
      },
    });
    sessions = (data ?? []) as PaymentSessionRow[];
  } catch (e) {
    logger.warn(
      `[reconcile-pending-payments] payment_session query failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return;
  }

  let processed = 0;
  for (const row of sessions) {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) continue;
    const st = (row.status ?? "").toLowerCase();
    if (st === "authorized" || st === "captured") continue;

    const data = row.data ?? {};
    const invoiceId =
      typeof data.maya_invoice_id === "string" ? data.maya_invoice_id.trim() : "";
    if (!invoiceId) continue;

    const { completed, amountMinor } = await fetchMayaInvoiceCompleted(
      invoiceId,
      secretKey,
      sandbox,
    );
    if (!completed) continue;

    try {
      await processPaymentWorkflow(container).run({
        input: {
          action: PaymentActions.SUCCESSFUL,
          data: {
            session_id: id,
            amount: amountMinor,
          },
        },
      });
      processed += 1;
      logger.info(
        `[reconcile-pending-payments] Completed stuck Maya session ${id} (invoice ${invoiceId}).`,
      );
    } catch (e) {
      logger.warn(
        `[reconcile-pending-payments] processPaymentWorkflow failed for ${id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  logger.info(
    `[reconcile-pending-payments] Scanned ${sessions.length} Maya session(s) older than ${minutes}m; reconciled ${processed}.`,
  );
}
