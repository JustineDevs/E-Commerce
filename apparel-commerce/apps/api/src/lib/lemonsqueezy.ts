const JSON_API_HEADERS = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
} as const;

export type CreateCheckoutResult = {
  checkoutId: string;
  checkoutUrl: string;
};

export async function createLemonSqueezyCheckout(input: {
  storeId: string;
  variantId: string;
  customPriceCents: number;
  customData: Record<string, string>;
  customerEmail?: string;
}): Promise<CreateCheckoutResult> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error("LEMONSQUEEZY_API_KEY is not set");
  }

  const checkoutData: Record<string, unknown> = {
    custom: input.customData,
  };
  if (input.customerEmail) {
    checkoutData.email = input.customerEmail;
  }

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: input.customPriceCents,
        checkout_data: checkoutData,
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: String(input.storeId),
          },
        },
        variant: {
          data: {
            type: "variants",
            id: String(input.variantId),
          },
        },
      },
    },
  };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      ...JSON_API_HEADERS,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LemonSqueezy checkout failed: ${res.status} ${text}`);
  }

  const json = JSON.parse(text) as {
    data?: { id?: string; attributes?: { url?: string } };
  };
  const checkoutId = json.data?.id;
  const checkoutUrl = json.data?.attributes?.url;
  if (!checkoutId || !checkoutUrl) {
    throw new Error("Lemon Squeezy response missing checkout id or url");
  }

  let hosted: URL;
  try {
    hosted = new URL(checkoutUrl);
  } catch {
    throw new Error("INVALID_CHECKOUT_URL");
  }
  if (hosted.protocol !== "https:") {
    throw new Error("INVALID_CHECKOUT_URL");
  }
  const host = hosted.hostname.toLowerCase();
  if (!host.endsWith(".lemonsqueezy.com") && host !== "lemonsqueezy.com") {
    throw new Error("INVALID_CHECKOUT_URL");
  }

  return { checkoutId, checkoutUrl };
}
