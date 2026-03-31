const PAYMONGO_API = "https://api.paymongo.com/v1";

function basicAuth(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export type PaymongoClientOptions = {
  secretKey: string;
};

export type PaymongoLinkInput = {
  amountMinor: number;
  currency: string;
  description: string;
};

export type PaymongoLinkResult = {
  linkId: string;
  checkoutUrl: string;
};

export type PaymongoLinkStatus = {
  status: string;
  amountMinor?: number;
};

export type PaymongoPaymentIntentInput = {
  amountMinor: number;
  currency: string;
  description: string;
  paymentMethodTypes?: string[];
};

export type PaymongoPaymentIntentResult = {
  intentId: string;
  clientKey: string;
  status: string;
};

export async function createPaymongoLink(
  options: PaymongoClientOptions,
  input: PaymongoLinkInput,
): Promise<PaymongoLinkResult> {
  const res = await fetch(`${PAYMONGO_API}/links`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(options.secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(input.amountMinor),
          currency: input.currency,
          description: input.description,
        },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayMongo create link failed: ${res.status} ${text}`);
  }
  const json = JSON.parse(text) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
  };
  const linkId = json.data?.id;
  const checkoutUrl = json.data?.attributes?.checkout_url;
  if (!linkId || !checkoutUrl) {
    throw new Error("PayMongo response missing link id or checkout_url.");
  }
  return { linkId, checkoutUrl };
}

export async function getPaymongoLink(
  options: PaymongoClientOptions,
  linkId: string,
): Promise<PaymongoLinkStatus> {
  const res = await fetch(
    `${PAYMONGO_API}/links/${encodeURIComponent(linkId)}`,
    {
      method: "GET",
      headers: { Authorization: basicAuth(options.secretKey) },
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayMongo retrieve link failed: ${res.status} ${text}`);
  }
  const json = JSON.parse(text) as {
    data?: { attributes?: { status?: string; amount?: number } };
  };
  return {
    status: (json.data?.attributes?.status ?? "").toLowerCase(),
    amountMinor: json.data?.attributes?.amount,
  };
}

export async function createPaymongoPaymentIntent(
  options: PaymongoClientOptions,
  input: PaymongoPaymentIntentInput,
): Promise<PaymongoPaymentIntentResult> {
  const res = await fetch(`${PAYMONGO_API}/payment_intents`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(options.secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(input.amountMinor),
          currency: input.currency,
          description: input.description,
          payment_method_allowed: input.paymentMethodTypes ?? [
            "card",
            "gcash",
            "grab_pay",
            "paymaya",
          ],
        },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayMongo create payment intent failed: ${res.status} ${text}`);
  }
  const json = JSON.parse(text) as {
    data?: {
      id?: string;
      attributes?: { client_key?: string; status?: string };
    };
  };
  return {
    intentId: json.data?.id ?? "",
    clientKey: json.data?.attributes?.client_key ?? "",
    status: json.data?.attributes?.status ?? "",
  };
}

export async function createPaymongoRefund(
  options: PaymongoClientOptions,
  paymentId: string,
  amountMinor: number,
  reason: string,
): Promise<{ refundId: string; status: string }> {
  const res = await fetch(`${PAYMONGO_API}/refunds`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(options.secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(amountMinor),
          payment_id: paymentId,
          reason,
        },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayMongo refund failed: ${res.status} ${text}`);
  }
  const json = JSON.parse(text) as {
    data?: { id?: string; attributes?: { status?: string } };
  };
  return {
    refundId: json.data?.id ?? "",
    status: json.data?.attributes?.status ?? "",
  };
}

export async function listPaymongoWebhooks(
  options: PaymongoClientOptions,
): Promise<Array<{ id: string; url: string; events: string[] }>> {
  const res = await fetch(`${PAYMONGO_API}/webhooks`, {
    method: "GET",
    headers: { Authorization: basicAuth(options.secretKey) },
  });
  if (!res.ok) {
    throw new Error(`PayMongo list webhooks failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: Array<{
      id?: string;
      attributes?: { url?: string; events?: string[] };
    }>;
  };
  return (json.data ?? []).map((w) => ({
    id: w.id ?? "",
    url: w.attributes?.url ?? "",
    events: w.attributes?.events ?? [],
  }));
}
