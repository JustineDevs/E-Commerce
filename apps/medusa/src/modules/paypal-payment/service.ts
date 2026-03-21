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
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";

export type PayPalPaymentOptions = {
  clientId: string;
  clientSecret: string;
  /** When true, use api-m.sandbox.paypal.com */
  sandbox: boolean;
};

function paypalApiBase(sandbox: boolean): string {
  return sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

async function getPayPalAccessToken(options: PayPalPaymentOptions): Promise<string> {
  const base = paypalApiBase(options.sandbox);
  const auth = Buffer.from(
    `${options.clientId}:${options.clientSecret}`,
    "utf8",
  ).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `PayPal OAuth failed: ${res.status} ${text}`,
    );
  }
  const json = JSON.parse(text) as { access_token?: string };
  if (!json.access_token) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayPal OAuth response missing access_token.",
    );
  }
  return json.access_token;
}

function minorToMajor(amountMinor: number, currency: string): string {
  const decimals = currency.toLowerCase() === "jpy" ? 0 : 2;
  const major = amountMinor / 100;
  return major.toFixed(decimals);
}

export default class PayPalPaymentProviderService extends AbstractPaymentProvider<PayPalPaymentOptions> {
  static identifier = "paypal";

  protected readonly options_: PayPalPaymentOptions;

  constructor(cradle: Record<string, unknown>, options: PayPalPaymentOptions) {
    super(cradle, options);
    this.options_ = options;
  }

  static validateOptions(options: Record<string, unknown>): void {
    const clientId = String(options.clientId ?? "").trim();
    const clientSecret = String(options.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PayPal payment provider: "clientId" and "clientSecret" are required.',
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
        "PayPal initiatePayment: missing session_id on payment session data.",
      );
    }
    const amountMinor = Number(input.amount);
    if (!Number.isFinite(amountMinor) || amountMinor < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayPal initiatePayment: invalid amount.",
      );
    }

    const currency = String(
      (input.context as { currency_code?: string } | undefined)?.currency_code ??
        "php",
    ).toUpperCase();

    const returnUrl =
      process.env.PAYPAL_RETURN_URL?.trim() ||
      process.env.STOREFRONT_PUBLIC_URL?.trim() ||
      `${DEFAULT_PUBLIC_SITE_ORIGIN.replace(/\/$/, "")}/checkout`;
    const cancelUrl =
      process.env.PAYPAL_CANCEL_URL?.trim() ||
      `${returnUrl.replace(/\/$/, "")}?paypal=cancel`;

    const token = await getPayPalAccessToken(this.options_);
    const base = paypalApiBase(this.options_.sandbox);
    const value = minorToMajor(amountMinor, currency);

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: sessionId.slice(0, 127),
            amount: {
              currency_code: currency,
              value: value,
            },
          },
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_action: "PAY_NOW",
        },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayPal create order failed: ${res.status} ${text}`,
      );
    }
    const json = JSON.parse(text) as {
      id?: string;
      links?: Array<{ href?: string; rel?: string }>;
    };
    const orderId = json.id;
    const approval = json.links?.find((l) => l.rel === "approve")?.href;
    if (!orderId || !approval) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayPal create order response missing id or approve link.",
      );
    }

    return {
      id: orderId,
      status: PaymentSessionStatus.REQUIRES_MORE,
      data: {
        session_id: sessionId,
        paypal_order_id: orderId,
        approval_url: approval,
      },
    };
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    const orderId =
      (input.data?.paypal_order_id as string | undefined) ??
      (input.data?.id as string | undefined);
    if (!orderId || typeof orderId !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayPal authorizePayment: missing paypal_order_id in session data.",
      );
    }

    const token = await getPayPalAccessToken(this.options_);
    const base = paypalApiBase(this.options_.sandbox);
    const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `PayPal capture failed: ${res.status} ${text}`,
      );
    }
    const json = JSON.parse(text) as {
      status?: string;
      purchase_units?: Array<{ payments?: { captures?: Array<{ amount?: { value?: string } }> } }>;
    };
    const status = (json.status ?? "").toUpperCase();
    if (status !== "COMPLETED") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `PayPal order not completed after capture: ${json.status ?? "unknown"}`,
      );
    }

    const captureAmount = json.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    const amountMinor =
      captureAmount != null
        ? Math.round(parseFloat(captureAmount) * 100)
        : undefined;

    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...((input.data as Record<string, unknown>) ?? {}),
        paypal_order_id: orderId,
        ...(amountMinor != null && Number.isFinite(amountMinor)
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
      "PayPal getPaymentStatus is not used.",
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

  async getWebhookActionAndData(
    _payload: {
      data: Record<string, unknown>;
      rawData: string | Buffer;
      headers: Record<string, unknown>;
    },
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED };
  }
}
