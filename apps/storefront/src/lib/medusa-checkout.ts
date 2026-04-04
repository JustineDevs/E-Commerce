import {
  formatMedusaCheckoutError,
  tryDeleteStoreCart,
} from "./medusa-checkout-errors";
import {
  getMedusaPaymentProviderId,
  getMedusaRegionId,
  getMedusaStoreBaseUrl,
  getMedusaPublishableKey,
} from "./storefront-medusa-env";
import {
  prepareMedusaStoreCart,
  reconcileMedusaCartGrandTotalMajor,
  type MedusaCheckoutLine,
  type CodCartPayload,
  type MedusaCheckoutTotalsPreview,
} from "./medusa-checkout-cart-prep";

export type { MedusaCheckoutLine, CodCartPayload, MedusaCheckoutTotalsPreview };

export type MedusaCheckoutResult = {
  checkoutUrl: string;
  cartId: string;
  providerLabel: string;
  /** Medusa cart total in major units (e.g. PHP) after shipping, loyalty, tax. */
  confirmedTotal: number;
  /** ISO currency code from the cart. */
  currencyCode: string;
  /** Stripe PaymentIntent client_secret when using Stripe Elements. */
  stripeClientSecret?: string;
  /** PayPal order ID when using PayPal JS SDK embedded buttons. */
  paypalOrderId?: string;
  /** Cash on delivery: cart was completed and an order was created. */
  codOrderPlaced?: boolean;
  /** Medusa order id when codOrderPlaced (e.g. order_...). */
  orderId?: string;
};

/** Provider IDs from the store payment module (pp_{module}_{id}). */
export const PAYMENT_PROVIDER_IDS = {
  STRIPE: "pp_stripe_stripe",
  PAYPAL: "pp_paypal_paypal",
  PAYMONGO: "pp_paymongo_paymongo",
  MAYA: "pp_maya_maya",
  COD: "pp_cod_cod",
} as const;

export type PaymentProviderKey = keyof typeof PAYMENT_PROVIDER_IDS;

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderKey, string> = {
  STRIPE: "Debit or credit card",
  PAYPAL: "PayPal balance or card",
  PAYMONGO: "GCash",
  MAYA: "PayMaya",
  COD: "Cash on delivery (COD)",
};

function isCodProviderId(providerId: string): boolean {
  return providerId === PAYMENT_PROVIDER_IDS.COD || providerId.includes("cod_cod");
}

/**
 * Loads live totals from the server (same Medusa path as pay). Prefer over calling Medusa from the browser.
 */
export async function previewMedusaCheckoutTotals(input: {
  lines: MedusaCheckoutLine[];
  email?: string;
  loyaltyPointsToRedeem?: number;
  paymentMethod: PaymentProviderKey;
}): Promise<MedusaCheckoutTotalsPreview> {
  if (typeof window === "undefined") {
    throw new Error("Checkout preview must run in the browser.");
  }
  const res = await fetch("/api/checkout/medusa-totals-preview", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lines: input.lines,
      email: input.email,
      loyaltyPointsToRedeem: input.loyaltyPointsToRedeem,
      paymentMethod: input.paymentMethod,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as MedusaCheckoutTotalsPreview & {
    error?: string;
    missingFields?: string[];
  };
  if (!res.ok) {
    const hint =
      Array.isArray(data.missingFields) && data.missingFields.length
        ? ` ${data.missingFields.join(", ")}`
        : "";
    throw new Error(
      (typeof data.error === "string" && data.error.trim()
        ? data.error
        : `Could not load checkout totals (${res.status}).`) + hint,
    );
  }
  if (
    typeof data.total !== "number" ||
    typeof data.currencyCode !== "string"
  ) {
    throw new Error("Invalid totals response from server.");
  }
  return data as MedusaCheckoutTotalsPreview;
}

export async function startMedusaCheckout(input: {
  lines: MedusaCheckoutLine[];
  email?: string;
  providerId?: string;
  /** Deducts from Supabase-backed balance and applies a cart discount line (requires Medusa env). */
  loyaltyPointsToRedeem?: number;
  /** Required when provider is COD; from POST /api/checkout/cod-cart-payload. */
  codCartPayload?: CodCartPayload;
}): Promise<MedusaCheckoutResult> {
  if (typeof window === "undefined") {
    throw new Error("Checkout must run in the browser.");
  }
  const baseUrl = getMedusaStoreBaseUrl();
  const publishableKey = getMedusaPublishableKey();
  const regionId = getMedusaRegionId();
  if (!publishableKey || !regionId) {
    throw new Error(
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY and NEXT_PUBLIC_MEDUSA_REGION_ID are required.",
    );
  }

  const providerId =
    input.providerId?.trim() || getMedusaPaymentProviderId();
  const codFlow = isCodProviderId(providerId);
  if (codFlow) {
    if (!input.codCartPayload?.email?.trim()) {
      throw new Error(
        "Cash on delivery requires a verified delivery profile. Open your account and complete your address, then try again.",
      );
    }
  }

  let cartId: string | undefined;
  try {
    const ctx = await prepareMedusaStoreCart(
      {
        lines: input.lines,
        email: codFlow ? undefined : input.email?.trim(),
        codCartPayload: codFlow ? input.codCartPayload : undefined,
        loyaltyPointsToRedeem: input.loyaltyPointsToRedeem,
      },
      codFlow,
    );
    cartId = ctx.cartId;
    const { sdk } = ctx;

    const { cart: refreshedForPayment } = await sdk.store.cart.retrieve(cartId, {
      fields: "+payment_collection,*payment_collection.payment_sessions",
    } as never);

    const { payment_collection } = await sdk.store.payment.initiatePaymentSession(
      refreshedForPayment,
      {
        provider_id: providerId,
        data: {
          idempotency_key: cartId,
        },
      },
    );

    const sessions = payment_collection?.payment_sessions ?? [];
    const session =
      sessions.find(
        (s: { provider_id?: string }) => s.provider_id === providerId,
      ) ?? sessions[0];
    const data = session?.data as Record<string, unknown> | undefined;

    const stripeClientSecret =
      typeof data?.client_secret === "string" ? data.client_secret : undefined;
    const paypalOid =
      typeof data?.paypal_order_id === "string"
        ? data.paypal_order_id
        : typeof data?.id === "string" && providerId.includes("paypal")
          ? data.id
          : undefined;

    const checkoutUrl =
      typeof data?.checkout_url === "string" ? data.checkout_url
        : typeof data?.approval_url === "string" ? data.approval_url
        : "";
    const hasEmbedded = Boolean(stripeClientSecret || paypalOid);
    const codSession = codFlow || data?.cod === true;
    if (!codSession && !hasEmbedded && (!checkoutUrl || !checkoutUrl.startsWith("https://"))) {
      throw new Error(
        "Payment session did not return a checkout URL or embedded payment data. Check provider configuration.",
      );
    }

    const entry = Object.entries(PAYMENT_PROVIDER_IDS).find(
      ([, id]) => id === providerId,
    );
    const providerLabel = entry
      ? PAYMENT_PROVIDER_LABELS[entry[0] as PaymentProviderKey]
      : "Payment";

    const { cart: priced } = await sdk.store.cart.retrieve(cartId, {
      fields:
        "id,total,currency_code,subtotal,tax_total,shipping_total,discount_total",
    } as never);
    const pricedObj =
      priced && typeof priced === "object"
        ? (priced as unknown as Record<string, unknown>)
        : {};
    const currencyRaw =
      priced && typeof priced === "object" && "currency_code" in priced
        ? String((priced as { currency_code?: string }).currency_code ?? "PHP")
        : "PHP";
    const { totalMajor: confirmedTotal } = reconcileMedusaCartGrandTotalMajor(
      pricedObj,
      currencyRaw,
    );

    if (codSession) {
      const completeFn = (
        sdk.store.cart as unknown as {
          complete?: (
            _id: string,
            _query?: unknown,
          ) => Promise<{
            type?: string;
            order?: { id?: string };
            cart?: unknown;
            error?: { message?: string } | string;
          }>;
        }
      ).complete;
      if (typeof completeFn !== "function") {
        throw new Error("Store SDK does not support cart completion. Update @medusajs/js-sdk.");
      }
      const completed = await completeFn(cartId, {} as never);
      if (completed?.type !== "order" || !completed.order?.id) {
        const errMsg =
          typeof completed?.error === "string"
            ? completed.error
            : completed?.error &&
                typeof completed.error === "object" &&
                "message" in completed.error
              ? String((completed.error as { message?: string }).message)
              : "Could not place your COD order. Check shipping options and try again.";
        throw new Error(errMsg);
      }
      return {
        checkoutUrl: "",
        cartId,
        orderId: completed.order.id,
        providerLabel,
        confirmedTotal,
        currencyCode: currencyRaw.toUpperCase(),
        codOrderPlaced: true,
      };
    }

    return {
      checkoutUrl,
      cartId,
      providerLabel,
      confirmedTotal,
      currencyCode: currencyRaw.toUpperCase(),
      stripeClientSecret,
      paypalOrderId: paypalOid,
    };
  } catch (e) {
    if (cartId) {
      await tryDeleteStoreCart(cartId, baseUrl, publishableKey);
    }
    throw new Error(formatMedusaCheckoutError(e));
  }
}
