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
import {
  buildLemonWebhookDedupId,
  claimLemonWebhookDedup,
} from "../../lib/lemon-webhook-dedup";

const JSON_API_HEADERS = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
} as const;

export type LemonSqueezyPaymentOptions = {
  apiKey: string;
  storeId: string;
  variantId: string;
  webhookSecret: string;
};

function verifyLemonSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader) {
    return false;
  }
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractMedusaSessionId(payload: Record<string, unknown>): string | undefined {
  const meta = payload.meta as
    | { custom_data?: { medusa_payment_session_id?: string } }
    | undefined;
  const fromMeta = meta?.custom_data?.medusa_payment_session_id;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  const data = payload.data as
    | {
        attributes?: {
          checkout_data?: {
            custom?: { medusa_payment_session_id?: string };
          };
        };
      }
    | undefined;
  const fromCheckout =
    data?.attributes?.checkout_data?.custom?.medusa_payment_session_id;
  if (typeof fromCheckout === "string" && fromCheckout.trim()) {
    return fromCheckout.trim();
  }
  return undefined;
}

function extractPaidTotalMinor(payload: Record<string, unknown>): number | undefined {
  const data = payload.data as
    | { attributes?: { total?: number; subtotal?: number } }
    | undefined;
  const total = data?.attributes?.total ?? data?.attributes?.subtotal;
  if (typeof total === "number" && Number.isFinite(total)) {
    return Math.max(0, Math.round(total));
  }
  return undefined;
}

function isPaidOrderWebhook(payload: Record<string, unknown>): boolean {
  const meta = payload.meta as { event_name?: string } | undefined;
  if (meta?.event_name !== "order_created") {
    return false;
  }
  const data = payload.data as { attributes?: { status?: string } } | undefined;
  const status = (data?.attributes?.status ?? "").toLowerCase();
  return status === "paid";
}

export default class LemonSqueezyPaymentProviderService extends AbstractPaymentProvider<LemonSqueezyPaymentOptions> {
  static identifier = "lemonsqueezy";

  protected readonly options_: LemonSqueezyPaymentOptions;

  constructor(cradle: Record<string, unknown>, options: LemonSqueezyPaymentOptions) {
    super(cradle, options);
    this.options_ = options;
  }

  static validateOptions(options: Record<string, unknown>): void {
    const keys: (keyof LemonSqueezyPaymentOptions)[] = [
      "apiKey",
      "storeId",
      "variantId",
      "webhookSecret",
    ];
    for (const k of keys) {
      if (!options[k] || typeof options[k] !== "string" || !(options[k] as string).trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Lemon Squeezy payment provider: "${String(k)}" is required in medusa-config module options.`
        );
      }
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const sessionId = input.data?.session_id;
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Lemon Squeezy initiatePayment: missing session_id on payment session data."
      );
    }

    const customPrice = Number(input.amount);
    if (!Number.isFinite(customPrice) || customPrice < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Lemon Squeezy initiatePayment: invalid amount."
      );
    }

    const checkoutData: Record<string, unknown> = {
      custom: {
        medusa_payment_session_id: sessionId,
      },
    };
    if (input.context?.customer?.email) {
      checkoutData.email = input.context.customer.email;
    }

    const body = {
      data: {
        type: "checkouts",
        attributes: {
          custom_price: customPrice,
          checkout_data: checkoutData,
        },
        relationships: {
          store: {
            data: { type: "stores", id: String(this.options_.storeId) },
          },
          variant: {
            data: { type: "variants", id: String(this.options_.variantId) },
          },
        },
      },
    };

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        ...JSON_API_HEADERS,
        Authorization: `Bearer ${this.options_.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Lemon Squeezy checkout failed: ${res.status} ${text}`
      );
    }

    const json = JSON.parse(text) as {
      data?: { id?: string; attributes?: { url?: string } };
    };
    const checkoutId = json.data?.id;
    const checkoutUrl = json.data?.attributes?.url;
    if (!checkoutId || !checkoutUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Lemon Squeezy response missing checkout id or url."
      );
    }

    let hosted: URL;
    try {
      hosted = new URL(checkoutUrl);
    } catch {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "INVALID_CHECKOUT_URL");
    }
    if (hosted.protocol !== "https:") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "INVALID_CHECKOUT_URL");
    }
    const host = hosted.hostname.toLowerCase();
    if (!host.endsWith(".lemonsqueezy.com") && host !== "lemonsqueezy.com") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "INVALID_CHECKOUT_URL");
    }

    return {
      id: checkoutId,
      status: PaymentSessionStatus.REQUIRES_MORE,
      data: {
        checkout_id: checkoutId,
        checkout_url: checkoutUrl,
        session_id: sessionId,
      },
    };
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const checkoutId = input.data?.checkout_id as string | undefined;
    if (!checkoutId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Lemon Squeezy authorizePayment: missing checkout_id."
      );
    }
    const paid = await this.verifyCheckoutPaid(checkoutId);
    if (!paid) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Lemon Squeezy order is not paid yet for this checkout."
      );
    }
    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...input.data,
        checkout_id: checkoutId,
      },
    };
  }

  private async verifyCheckoutPaid(checkoutId: string): Promise<boolean> {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/checkouts/${checkoutId}`, {
      headers: {
        ...JSON_API_HEADERS,
        Authorization: `Bearer ${this.options_.apiKey}`,
      },
    });
    if (!res.ok) {
      return false;
    }
    const json = (await res.json()) as {
      data?: {
        attributes?: { status?: string };
        relationships?: { order?: { data?: { id?: string } } };
      };
    };
    const status = (json.data?.attributes?.status ?? "").toLowerCase();
    if (status === "expired") {
      return false;
    }
    const orderId = json.data?.relationships?.order?.data?.id;
    if (!orderId) {
      return false;
    }
    const ores = await fetch(`https://api.lemonsqueezy.com/v1/orders/${orderId}`, {
      headers: {
        ...JSON_API_HEADERS,
        Authorization: `Bearer ${this.options_.apiKey}`,
      },
    });
    if (!ores.ok) {
      return false;
    }
    const orderJson = (await ores.json()) as {
      data?: { attributes?: { status?: string } };
    };
    const ostatus = (orderJson.data?.attributes?.status ?? "").toLowerCase();
    return ostatus === "paid";
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
    _input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Lemon Squeezy getPaymentStatus is not used; rely on authorizePayment / webhooks."
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
    input: CreateAccountHolderInput
  ): Promise<CreateAccountHolderOutput> {
    return { id: input.context.customer.id };
  }

  async retrieveAccountHolder(
    input: RetrieveAccountHolderInput
  ): Promise<RetrieveAccountHolderOutput> {
    return { id: input.id };
  }

  async deleteAccountHolder(
    _input: DeleteAccountHolderInput
  ): Promise<DeleteAccountHolderOutput> {
    return { data: {} };
  }

  async getWebhookActionAndData(
    payload: { data: Record<string, unknown>; rawData: string | Buffer; headers: Record<string, unknown> }
  ): Promise<WebhookActionResult> {
    const raw =
      typeof payload.rawData === "string"
        ? Buffer.from(payload.rawData, "utf8")
        : Buffer.isBuffer(payload.rawData)
          ? payload.rawData
          : Buffer.from(JSON.stringify(payload.rawData));

    const signature =
      (payload.headers["x-signature"] as string | undefined) ??
      (payload.headers["X-Signature"] as string | undefined);

    if (
      !verifyLemonSignature(raw, signature, this.options_.webhookSecret)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid Lemon Squeezy webhook signature."
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
    } catch {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid Lemon webhook JSON.");
    }

    if (!isPaidOrderWebhook(body)) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    const dedupId = buildLemonWebhookDedupId(body);
    if (dedupId) {
      const first = await claimLemonWebhookDedup(dedupId);
      if (!first) {
        return { action: PaymentActions.NOT_SUPPORTED };
      }
    }

    const sessionId = extractMedusaSessionId(body);
    if (!sessionId) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    const total = extractPaidTotalMinor(body);
    if (total == null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Lemon webhook missing order total."
      );
    }

    return {
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: sessionId,
        amount: total,
      },
    };
  }
}
