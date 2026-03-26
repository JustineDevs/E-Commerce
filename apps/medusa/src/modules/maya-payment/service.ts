import crypto from "crypto";
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CreateAccountHolderInput,
  CreateAccountHolderOutput,
  DeleteAccountHolderInput,
  DeleteAccountHolderOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrieveAccountHolderInput,
  RetrieveAccountHolderOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils";
import { buildMayaWebhookDedupId, claimMayaWebhookDedup } from "../../lib/maya-webhook-dedup";

const MAYA_SANDBOX_API = "https://pg-sandbox.paymaya.com";
const MAYA_PROD_API = "https://pg.paymaya.com";
const MAYA_SANDBOX_CHECKOUT = "https://payments-web-sandbox.paymaya.com/invoice";
const MAYA_PROD_CHECKOUT = "https://payments.paymaya.com/invoice";

export type MayaPaymentOptions = {
  secretKey: string;
  /** Used to verify webhooks */
  webhookSecret: string;
  /** Use sandbox when true */
  sandbox?: boolean;
};

function getMayaApiBase(sandbox: boolean): string {
  return sandbox ? MAYA_SANDBOX_API : MAYA_PROD_API;
}

function getMayaCheckoutBase(sandbox: boolean): string {
  return sandbox ? MAYA_SANDBOX_CHECKOUT : MAYA_PROD_CHECKOUT;
}

function basicAuth(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

function parseSessionFromRequestRef(ref: string | undefined): string | undefined {
  const prefix = "medusa_ps:";
  if (!ref?.startsWith(prefix)) return undefined;
  const id = ref.slice(prefix.length).trim();
  return id.length > 0 ? id : undefined;
}

function verifyMayaSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default class MayaPaymentProviderService extends AbstractPaymentProvider<MayaPaymentOptions> {
  static identifier = "maya";

  protected readonly options_: MayaPaymentOptions;

  constructor(cradle: Record<string, unknown>, options: MayaPaymentOptions) {
    super(cradle, options);
    this.options_ = options;
  }

  static validateOptions(options: Record<string, unknown>): void {
    const secretKey = String(options.secretKey ?? "").trim();
    const webhookSecret = String(options.webhookSecret ?? "").trim();
    if (!secretKey || !webhookSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Maya payment provider: "secretKey" and "webhookSecret" are required.',
      );
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    const sessionId = input.data?.session_id;
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Maya initiatePayment: missing session_id on payment session data.",
      );
    }
    const amountMinor = Number(input.amount);
    if (!Number.isFinite(amountMinor) || amountMinor < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Maya initiatePayment: invalid amount.",
      );
    }

    const amountValue = Number(((amountMinor / 100).toFixed(2)));
    const sandbox = this.options_.sandbox ?? process.env.NODE_ENV !== "production";
    const apiBase = getMayaApiBase(sandbox);
    const storefrontUrl = process.env.STOREFRONT_PUBLIC_URL ?? "https://maharlika-apparel-custom.vercel.app";

    const res = await fetch(`${apiBase}/invoice/v2/invoices`, {
      method: "POST",
      headers: {
        Authorization: basicAuth(this.options_.secretKey),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        invoiceNumber: `INV-${sessionId.slice(0, 12)}-${Date.now().toString(36)}`,
        type: "SINGLE",
        totalAmount: { value: amountValue, currency: "PHP" },
        redirectUrl: {
          success: `${storefrontUrl}/checkout?maya=success`,
          failure: `${storefrontUrl}/checkout?maya=failure`,
          cancel: `${storefrontUrl}/checkout?maya=cancel`,
        },
        requestReferenceNumber: `medusa_ps:${sessionId}`,
        metadata: {},
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Maya create invoice failed: ${res.status} ${text}`,
      );
    }

    const json = JSON.parse(text) as { id?: string };
    const invoiceId = json.id;
    if (!invoiceId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Maya create invoice response missing id.",
      );
    }

    const checkoutBase = getMayaCheckoutBase(sandbox);
    const checkoutUrl = `${checkoutBase}?id=${encodeURIComponent(invoiceId)}`;

    return {
      id: invoiceId,
      status: PaymentSessionStatus.REQUIRES_MORE,
      data: {
        session_id: sessionId,
        maya_invoice_id: invoiceId,
        checkout_url: checkoutUrl,
      },
    };
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    const invoiceId = input.data?.maya_invoice_id as string | undefined;
    if (!invoiceId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Maya authorizePayment: missing maya_invoice_id in session data.",
      );
    }

    const sandbox = this.options_.sandbox ?? process.env.NODE_ENV !== "production";
    const apiBase = getMayaApiBase(sandbox);

    const res = await fetch(`${apiBase}/invoice/v2/invoices/${encodeURIComponent(invoiceId)}`, {
      method: "GET",
      headers: {
        Authorization: basicAuth(this.options_.secretKey),
        Accept: "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Maya retrieve invoice failed: ${res.status} ${text}`,
      );
    }

    const json = JSON.parse(text) as {
      status?: string;
      totalAmount?: { value?: string };
      payments?: Array<{ status?: string }>;
    };
    const status = (json.status ?? "").toUpperCase();
    if (status !== "COMPLETED") {
      const payStatus = json.payments?.[0]?.status ?? "unknown";
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Maya invoice is not paid yet (status=${status}, payment=${payStatus}).`,
      );
    }

    const amountStr = json.totalAmount?.value;
    const amountMinor = amountStr != null ? Math.round(parseFloat(String(amountStr)) * 100) : undefined;

    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...((input.data as Record<string, unknown>) ?? {}),
        maya_invoice_id: invoiceId,
        ...(typeof amountMinor === "number" && Number.isFinite(amountMinor)
          ? { captured_amount_minor: amountMinor }
          : {}),
      },
    };
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getPaymentStatus(
    _input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Maya getPaymentStatus is not used.",
    );
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: input.data ?? {} };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async createAccountHolder(
    input: CreateAccountHolderInput,
  ): Promise<CreateAccountHolderOutput> {
    return { id: input.context.customer.id };
  }

  async retrieveAccountHolder(
    input: RetrieveAccountHolderInput,
  ): Promise<RetrieveAccountHolderOutput> {
    return { id: input.id };
  }

  async deleteAccountHolder(
    _input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    return { data: {} };
  }

  async getWebhookActionAndData(payload: {
    data: Record<string, unknown>;
    rawData: string | Buffer;
    headers: Record<string, unknown>;
  }): Promise<WebhookActionResult> {
    const raw =
      typeof payload.rawData === "string"
        ? payload.rawData
        : Buffer.isBuffer(payload.rawData)
          ? payload.rawData.toString("utf8")
          : JSON.stringify(payload.rawData);

    const signatureHeader =
      (payload.headers["x-maya-signature"] as string | undefined) ??
      (payload.headers["x-paymaya-signature"] as string | undefined) ??
      "";

    if (this.options_.webhookSecret && this.options_.webhookSecret.trim()) {
      if (!verifyMayaSignature(raw, signatureHeader, this.options_.webhookSecret)) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Maya webhook signature verification failed.",
        );
      }
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid Maya webhook JSON.",
      );
    }

    const successPayload = this.mayaWebhookSuccessPayload(body);
    const dedupId = buildMayaWebhookDedupId(body);
    if (dedupId) {
      const isFirst = await claimMayaWebhookDedup(dedupId);
      if (!isFirst) {
        // Gateway retries must get the same success shape so HTTP 200 is returned
        // while Medusa payment processing stays idempotent downstream.
        return successPayload ?? { action: PaymentActions.NOT_SUPPORTED };
      }
    }

    return successPayload ?? { action: PaymentActions.NOT_SUPPORTED };
  }

  /** Parsed PAYMENT_SUCCESS payload, or null if this delivery should be ignored. */
  private mayaWebhookSuccessPayload(
    body: Record<string, unknown>,
  ): WebhookActionResult | null {
    const paymentStatus = (body.paymentStatus as string) ?? "";
    if (paymentStatus !== "PAYMENT_SUCCESS") {
      return null;
    }

    const requestRef = body.requestReferenceNumber as string | undefined;
    const sessionId = parseSessionFromRequestRef(requestRef);
    if (!sessionId) {
      return null;
    }

    const webhookBody = body as {
      totalAmount?: { value?: string | number };
      amount?: string | number;
    };
    const amountRaw =
      webhookBody.totalAmount?.value != null
        ? parseFloat(String(webhookBody.totalAmount.value))
        : webhookBody.amount != null
          ? parseFloat(String(webhookBody.amount))
          : NaN;
    const amountMinor = Number.isFinite(amountRaw) ? Math.round(amountRaw * 100) : 0;

    return {
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: sessionId,
        amount: Math.max(0, amountMinor),
      },
    };
  }
}
