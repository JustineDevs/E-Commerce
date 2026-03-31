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
import crypto from "node:crypto";
import { buildPaymongoWebhookDedupId, claimPaymongoWebhookDedup } from "../../lib/paymongo-webhook-dedup";
import {
  createPaymongoLink,
  getPaymongoLink,
  type PaymongoClientOptions,
} from "../../lib/paymongo-sdk-client";

export type PaymongoPaymentOptions = {
  secretKey: string;
  webhookSecret: string;
};

function parseSessionFromDescription(description: string): string | undefined {
  const prefix = "medusa_ps:";
  if (!description.startsWith(prefix)) {
    return undefined;
  }
  const id = description.slice(prefix.length).trim();
  return id.length > 0 ? id : undefined;
}

function verifyPaymongoSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  webhookSecret: string,
): boolean {
  if (!signatureHeader?.trim()) {
    return false;
  }
  const parts = signatureHeader.split(",");
  let timestamp = "";
  let sig = "";
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k?.trim() === "t") {
      timestamp = v ?? "";
    }
    if (k?.trim() === "te" || k?.trim() === "li") {
      sig = v ?? "";
    }
  }
  if (!timestamp || !sig) {
    return false;
  }
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default class PaymongoPaymentProviderService extends AbstractPaymentProvider<PaymongoPaymentOptions> {
  static identifier = "paymongo";

  protected readonly options_: PaymongoPaymentOptions;

  constructor(cradle: Record<string, unknown>, options: PaymongoPaymentOptions) {
    super(cradle, options);
    this.options_ = options;
  }

  static validateOptions(options: Record<string, unknown>): void {
    const secretKey = String(options.secretKey ?? "").trim();
    const webhookSecret = String(options.webhookSecret ?? "").trim();
    if (!secretKey || !webhookSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Paymongo payment provider: "secretKey" and "webhookSecret" are required.',
      );
    }
  }

  private get clientOptions(): PaymongoClientOptions {
    return { secretKey: this.options_.secretKey };
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    const sessionId = input.data?.session_id;
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Paymongo initiatePayment: missing session_id on payment session data.",
      );
    }
    const amountMinor = Number(input.amount);
    if (!Number.isFinite(amountMinor) || amountMinor < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Paymongo initiatePayment: invalid amount.",
      );
    }

    const currency = String(
      (input.context as { currency_code?: string } | undefined)?.currency_code ??
        "php",
    ).toLowerCase();

    try {
      const { linkId, checkoutUrl } = await createPaymongoLink(
        this.clientOptions,
        {
          amountMinor,
          currency,
          description: `medusa_ps:${sessionId}`,
        },
      );

      return {
        id: linkId,
        status: PaymentSessionStatus.REQUIRES_MORE,
        data: {
          session_id: sessionId,
          paymongo_link_id: linkId,
          checkout_url: checkoutUrl,
        },
      };
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Paymongo create link failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    const linkId = input.data?.paymongo_link_id as string | undefined;
    if (!linkId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Paymongo authorizePayment: missing paymongo_link_id in session data.",
      );
    }

    try {
      const { status, amountMinor } = await getPaymongoLink(
        this.clientOptions,
        linkId,
      );
      if (status !== "paid") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Paymongo link is not paid yet (status=${status || "unknown"}).`,
        );
      }

      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: {
          ...((input.data as Record<string, unknown>) ?? {}),
          paymongo_link_id: linkId,
          ...(typeof amountMinor === "number" && Number.isFinite(amountMinor)
            ? { captured_amount_minor: amountMinor }
            : {}),
        },
      };
    } catch (err) {
      if (err instanceof MedusaError) throw err;
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Paymongo retrieve link failed: ${err instanceof Error ? err.message : String(err)}`,
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
      "Paymongo getPaymentStatus is not used.",
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

    const signature =
      (payload.headers["paymongo-signature"] as string | undefined) ??
      (payload.headers["Paymongo-Signature"] as string | undefined);

    if (!verifyPaymongoSignature(raw, signature, this.options_.webhookSecret)) {
      console.error(
        "[payment-webhook] verification_failed provider=paymongo reason=invalid_signature",
      );
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid Paymongo webhook signature.",
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid Paymongo webhook JSON.",
      );
    }

    const successPayload = this.paymongoWebhookSuccessPayload(body);
    const dedupId = buildPaymongoWebhookDedupId(body);
    if (dedupId) {
      const isFirst = await claimPaymongoWebhookDedup(dedupId);
      if (!isFirst) {
        return successPayload ?? { action: PaymentActions.NOT_SUPPORTED };
      }
    }

    if (!successPayload) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }
    return successPayload;
  }

  private paymongoWebhookSuccessPayload(
    body: Record<string, unknown>,
  ): WebhookActionResult | null {
    const evt = body.data as
      | {
          attributes?: {
            type?: string;
            data?: {
              attributes?: {
                description?: string;
                amount?: number;
                status?: string;
              };
            };
          };
        }
      | undefined;

    const eventType = String(evt?.attributes?.type ?? "");
    if (eventType !== "link.payment.paid") {
      return null;
    }

    const linkAttrs = evt?.attributes?.data?.attributes;
    const description = linkAttrs?.description;
    if (typeof description !== "string") {
      return null;
    }

    const sessionId = parseSessionFromDescription(description);
    if (!sessionId) {
      return null;
    }

    const status = (linkAttrs?.status ?? "").toLowerCase();
    if (status !== "paid") {
      return null;
    }

    const amount = linkAttrs?.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Paymongo webhook missing link amount.",
      );
    }

    return {
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: sessionId,
        amount: Math.max(0, Math.round(amount)),
      },
    };
  }
}
