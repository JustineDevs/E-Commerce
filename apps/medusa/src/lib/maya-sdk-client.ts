const MAYA_SANDBOX_API = "https://pg-sandbox.paymaya.com";
const MAYA_PROD_API = "https://pg.paymaya.com";
const MAYA_SANDBOX_CHECKOUT = "https://payments-web-sandbox.paymaya.com/invoice";
const MAYA_PROD_CHECKOUT = "https://payments.paymaya.com/invoice";

function basicAuth(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export type MayaClientOptions = {
  secretKey: string;
  sandbox: boolean;
};

export type MayaInvoiceInput = {
  sessionId: string;
  amountValue: number;
  currency?: string;
  storefrontUrl: string;
};

export type MayaInvoiceResult = {
  invoiceId: string;
  checkoutUrl: string;
};

export type MayaInvoiceStatus = {
  status: string;
  amountMinor?: number;
  paymentStatus?: string;
};

function getApiBase(sandbox: boolean): string {
  return sandbox ? MAYA_SANDBOX_API : MAYA_PROD_API;
}

function getCheckoutBase(sandbox: boolean): string {
  return sandbox ? MAYA_SANDBOX_CHECKOUT : MAYA_PROD_CHECKOUT;
}

export async function createMayaInvoice(
  options: MayaClientOptions,
  input: MayaInvoiceInput,
): Promise<MayaInvoiceResult> {
  const apiBase = getApiBase(options.sandbox);

  const res = await fetch(`${apiBase}/invoice/v2/invoices`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(options.secretKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      invoiceNumber: `INV-${input.sessionId.slice(0, 12)}-${Date.now().toString(36)}`,
      type: "SINGLE",
      totalAmount: {
        value: input.amountValue,
        currency: input.currency ?? "PHP",
      },
      redirectUrl: {
        success: `${input.storefrontUrl}/checkout?maya=success`,
        failure: `${input.storefrontUrl}/checkout?maya=failure`,
        cancel: `${input.storefrontUrl}/checkout?maya=cancel`,
      },
      requestReferenceNumber: `medusa_ps:${input.sessionId}`,
      metadata: {},
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Maya create invoice failed: ${res.status} ${text}`);
  }

  const json = JSON.parse(text) as { id?: string };
  const invoiceId = json.id;
  if (!invoiceId) {
    throw new Error("Maya create invoice response missing id.");
  }

  const checkoutBase = getCheckoutBase(options.sandbox);
  const checkoutUrl = `${checkoutBase}?id=${encodeURIComponent(invoiceId)}`;

  return { invoiceId, checkoutUrl };
}

export async function getMayaInvoice(
  options: MayaClientOptions,
  invoiceId: string,
): Promise<MayaInvoiceStatus> {
  const apiBase = getApiBase(options.sandbox);

  const res = await fetch(
    `${apiBase}/invoice/v2/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: "GET",
      headers: {
        Authorization: basicAuth(options.secretKey),
        Accept: "application/json",
      },
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Maya retrieve invoice failed: ${res.status} ${text}`);
  }

  const json = JSON.parse(text) as {
    status?: string;
    totalAmount?: { value?: string };
    payments?: Array<{ status?: string }>;
  };

  const amountStr = json.totalAmount?.value;
  const amountMinor = amountStr != null
    ? Math.round(parseFloat(String(amountStr)) * 100)
    : undefined;

  return {
    status: (json.status ?? "").toUpperCase(),
    amountMinor,
    paymentStatus: json.payments?.[0]?.status,
  };
}

export async function createMayaVaultToken(
  options: MayaClientOptions,
  cardDetails: {
    number: string;
    expMonth: string;
    expYear: string;
    cvc: string;
  },
): Promise<{ paymentTokenId: string; state: string }> {
  const apiBase = getApiBase(options.sandbox);

  const res = await fetch(`${apiBase}/payments/v1/payment-tokens`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(options.secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      card: {
        number: cardDetails.number,
        expMonth: cardDetails.expMonth,
        expYear: cardDetails.expYear,
        cvc: cardDetails.cvc,
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Maya vault token failed: ${res.status} ${text}`);
  }
  const json = JSON.parse(text) as {
    paymentTokenId?: string;
    state?: string;
  };
  return {
    paymentTokenId: json.paymentTokenId ?? "",
    state: json.state ?? "",
  };
}

export async function createMayaCheckoutSession(
  options: MayaClientOptions,
  input: {
    totalAmount: { value: number; currency: string };
    items: Array<{ name: string; quantity: number; totalAmount: { value: number } }>;
    requestReferenceNumber: string;
    redirectUrl: { success: string; failure: string; cancel: string };
  },
): Promise<{ checkoutId: string; redirectUrl: string }> {
  const apiBase = getApiBase(options.sandbox);

  const res = await fetch(`${apiBase}/checkout/v1/checkouts`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(options.secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Maya checkout session failed: ${res.status} ${text}`);
  }
  const json = JSON.parse(text) as {
    checkoutId?: string;
    redirectUrl?: string;
  };
  return {
    checkoutId: json.checkoutId ?? "",
    redirectUrl: json.redirectUrl ?? "",
  };
}
