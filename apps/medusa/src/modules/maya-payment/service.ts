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
import {
  createMayaInvoice,
  getMayaInvoice,
  type MayaClientOptions,
} from "../../lib/maya-sdk-client";

export type MayaPaymentOptions = {
  secretKey: string;
  webhookSecret: string;
  sandbox?: boolean;
};

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

export function formatMayaCreateInvoiceError(
  error: unknown,
  sandbox: boolean,
): string {
  const raw = (error instanceof Error ? error.message : String(error ?? "")).trim();
  const message = raw.replace(/^Maya create invoice failed:\s*/i, "");
  if (!message) {
    return "Unknown Maya invoice error.";
  }
  if (/401|403|unauthorized|forbidden/i.test(message)) {
    return `${message}. Check MAYA_SECRET_KEY and MAYA_SANDBOX; the key must match the ${
      sandbox ? "sandbox" : "production"
    } PayMaya environment.`;
  }
  return message;
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

  private get clientOptions(): MayaClientOptions {
    return {
      secretKey: this.options_.secretKey,
      sandbox: this.options_.sandbox ?? process.env.NODE_ENV !== "production",
    };
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
    const storefrontUrl = process.env.STOREFRONT_PUBLIC_URL ?? "https://maharlika-apparel-custom.vercel.app";

    try {
      const { invoiceId, checkoutUrl } = await createMayaInvoice(
        this.clientOptions,
        {
          sessionId,
          amountValue,
          currency: "PHP",
          storefrontUrl,
        },
      );

      return {
        id: invoiceId,
        status: PaymentSessionStatus.REQUIRES_MORE,
        data: {
          session_id: sessionId,
          maya_invoice_id: invoiceId,
          checkout_url: checkoutUrl,
        },
      };
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Maya create invoice failed: ${formatMayaCreateInvoiceError(
          err,
          this.clientOptions.sandbox,
        )}`,
      );
    }
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

    try {
      const { status, amountMinor, paymentStatus } = await getMayaInvoice(
        this.clientOptions,
        invoiceId,
      );

      if (status !== "COMPLETED") {
        console.error(
          "[payment-pipeline] authorize_failed provider=maya reason=invoice_not_paid status=",
          status,
          "payment=",
          paymentStatus ?? "unknown",
        );
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Maya invoice is not paid yet (status=${status}, payment=${paymentStatus ?? "unknown"}).`,
        );
      }

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
    } catch (err) {
      if (err instanceof MedusaError) throw err;
      console.error(
        "[payment-pipeline] authorize_failed provider=maya reason=invoice_http",
        err,
      );
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Maya retrieve invoice failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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
        console.error(
          "[payment-webhook] verification_failed provider=maya reason=invalid_signature",
        );
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
