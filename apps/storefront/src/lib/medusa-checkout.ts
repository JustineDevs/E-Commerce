import Medusa from "@medusajs/js-sdk";
import {
  formatMedusaCheckoutError,
  tryDeleteStoreCart,
} from "./medusa-checkout-errors";
import {
  getMedusaPaymentProviderId,
  getMedusaRegionId,
  getMedusaStoreBaseUrl,
  getMedusaPublishableKey,
  withSalesChannelId,
} from "./storefront-medusa-env";
import { medusaMinorToMajor } from "./medusa-money";
import type { MedusaCartAddressPayload } from "@/lib/medusa-profile-address";

export type MedusaCheckoutLine = { variantId: string; quantity: number };

/** Server from POST /api/checkout/cod-cart-payload; required when paying with COD. */
export type CodCartPayload = {
  email: string;
  shipping_address: MedusaCartAddressPayload;
  billing_address: MedusaCartAddressPayload;
};

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

/** Providers where payment is completed inline (embedded) on the storefront. */
export const EMBEDDED_PROVIDERS: ReadonlySet<PaymentProviderKey> = new Set([
  "STRIPE",
  "PAYPAL",
]);

function isCodProviderId(providerId: string): boolean {
  return providerId === PAYMENT_PROVIDER_IDS.COD || providerId.includes("cod_cod");
}

/** Returns true if the provider key uses embedded checkout instead of redirect. */
export function isEmbeddedProvider(key: PaymentProviderKey): boolean {
  return EMBEDDED_PROVIDERS.has(key);
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

  const sdk = new Medusa({ baseUrl, publishableKey });
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
    const { cart: created } = await sdk.store.cart.create(
      withSalesChannelId({ region_id: regionId }) as Parameters<
        typeof sdk.store.cart.create
      >[0],
    );
    cartId = created?.id;
    if (!cartId) {
      throw new Error("The store did not return a cart id.");
    }

    for (const line of input.lines) {
      await sdk.store.cart.createLineItem(cartId, {
        variant_id: line.variantId,
        quantity: line.quantity,
      });
    }

    const cartEmail = codFlow
      ? input.codCartPayload!.email.trim()
      : input.email?.trim();
    if (cartEmail) {
      await sdk.store.cart.update(cartId, { email: cartEmail });
    }

    if (codFlow && input.codCartPayload) {
      await sdk.store.cart.update(cartId, {
        shipping_address: input.codCartPayload.shipping_address,
        billing_address: input.codCartPayload.billing_address,
      });
    }

    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: cartId,
    });
    const firstOption = shipping_options?.[0];
    if (!firstOption?.id) {
      throw new Error(
        "No shipping options available for this cart. Check your region and shipping setup.",
      );
    }

    await sdk.store.cart.addShippingMethod(cartId, { option_id: firstOption.id });

    const loyaltyPts = Math.floor(Number(input.loyaltyPointsToRedeem ?? 0));
    if (loyaltyPts > 0) {
      if (!cartEmail) {
        throw new Error("Email is required on the cart before redeeming loyalty points.");
      }
      const loyaltyRes = await fetch(
        `${baseUrl.replace(/\/$/, "")}/store/carts/${encodeURIComponent(cartId)}/loyalty`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": publishableKey,
          },
          body: JSON.stringify({ points: loyaltyPts }),
        },
      );
      if (!loyaltyRes.ok) {
        const errText = await loyaltyRes.text().catch(() => "");
        throw new Error(
          errText || `Loyalty redemption failed (${loyaltyRes.status}).`,
        );
      }
    }

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
      fields: "id,total,currency_code,subtotal,tax_total",
    } as never);
    const rawTotal = priced && typeof priced === "object" && "total" in priced
      ? Number((priced as { total?: unknown }).total)
      : NaN;
    const totalMinor = Number.isFinite(rawTotal) ? rawTotal : 0;
    const currencyRaw =
      priced && typeof priced === "object" && "currency_code" in priced
        ? String((priced as { currency_code?: string }).currency_code ?? "PHP")
        : "PHP";
    const confirmedTotal = medusaMinorToMajor(totalMinor, currencyRaw);

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

