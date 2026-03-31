import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  PaypalExperienceUserAction,
  type Order,
  type OrderRequest,
} from "@paypal/paypal-server-sdk";

const PAYPAL_TIMEOUT_MS = 30_000;

export type PayPalClientOptions = {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
};

type PayPalClientInstance = InstanceType<typeof Client>;

let _cachedClient: { key: string; client: PayPalClientInstance } | null = null;

function getPayPalClient(options: PayPalClientOptions): PayPalClientInstance {
  const key = `${options.clientId}:${options.sandbox}`;
  if (_cachedClient?.key === key) {
    return _cachedClient.client;
  }
  const client = new Client({
    timeout: PAYPAL_TIMEOUT_MS,
    environment: options.sandbox
      ? Environment.Sandbox
      : Environment.Production,
    clientCredentialsAuthCredentials: {
      oAuthClientId: options.clientId,
      oAuthClientSecret: options.clientSecret,
    },
  });
  _cachedClient = { key, client };
  return client;
}

export async function createPayPalOrder(
  options: PayPalClientOptions,
  input: {
    sessionId: string;
    amountMajor: string;
    currencyCode: string;
    returnUrl: string;
    cancelUrl: string;
  },
): Promise<{ orderId: string; approvalUrl: string }> {
  const client = getPayPalClient(options);
  const ordersController = new OrdersController(client);

  const body: OrderRequest = {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [
      {
        customId: input.sessionId.slice(0, 127),
        amount: {
          currencyCode: input.currencyCode,
          value: input.amountMajor,
        },
      },
    ],
    paymentSource: {
      paypal: {
        experienceContext: {
          returnUrl: input.returnUrl,
          cancelUrl: input.cancelUrl,
          userAction: PaypalExperienceUserAction.PayNow,
        },
      },
    },
  };

  const { result } = await ordersController.createOrder({ body });

  const orderId = result.id;
  const approvalLink = result.links?.find(
    (l) => l.rel === "approve" || l.rel === "payer-action",
  );
  const approvalUrl = approvalLink?.href;

  if (!orderId || !approvalUrl) {
    throw new Error("PayPal create order response missing id or approve link.");
  }

  return { orderId, approvalUrl };
}

export async function capturePayPalOrder(
  options: PayPalClientOptions,
  orderId: string,
): Promise<{ status: string; captureAmountMinor: number | undefined }> {
  const client = getPayPalClient(options);
  const ordersController = new OrdersController(client);

  const { result } = await ordersController.captureOrder({ id: orderId });

  const status = (result.status ?? "").toUpperCase();
  const captureAmount =
    result.purchaseUnits?.[0]?.payments?.captures?.[0]?.amount?.value;
  const amountMinor =
    captureAmount != null
      ? Math.round(parseFloat(captureAmount) * 100)
      : undefined;

  return { status, captureAmountMinor: amountMinor };
}

export async function getPayPalOrder(
  options: PayPalClientOptions,
  orderId: string,
): Promise<Order> {
  const client = getPayPalClient(options);
  const ordersController = new OrdersController(client);
  const { result } = await ordersController.getOrder({ id: orderId });
  return result;
}

export async function verifyPayPalWebhookSignature(
  options: PayPalClientOptions,
  headers: Record<string, unknown>,
  rawBody: string,
  webhookId: string,
): Promise<boolean> {
  const base = options.sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const transmissionId = String(headers["paypal-transmission-id"] ?? "");
  const transmissionTime = String(headers["paypal-transmission-time"] ?? "");
  const transmissionSig = String(headers["paypal-transmission-sig"] ?? "");
  const authAlgo = String(headers["paypal-auth-algo"] ?? "");
  const certUrl = String(headers["paypal-cert-url"] ?? "");

  if (!transmissionId || !transmissionTime || !transmissionSig) {
    return false;
  }

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) return false;
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) return false;

  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!verifyRes.ok) return false;
  const result = (await verifyRes.json()) as { verification_status?: string };
  return result.verification_status === "SUCCESS";
}
