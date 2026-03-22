import Medusa from "@medusajs/js-sdk";
import {
  getMedusaPaymentProviderId,
  getMedusaRegionId,
  getMedusaStoreBaseUrl,
  getMedusaPublishableKey,
} from "./storefront-medusa-env";

export type MedusaCheckoutLine = { variantId: string; quantity: number };

export type MedusaCheckoutResult = {
  checkoutUrl: string;
  cartId: string;
  providerLabel: string;
};

/** Provider IDs from Medusa (pp_{module}_{id}). */
export const PAYMENT_PROVIDER_IDS = {
  LEMONSQUEEZY: "pp_lemonsqueezy_lemonsqueezy",
  PAYMONGO: "pp_paymongo_paymongo",
  MAYA: "pp_maya_maya",
} as const;

export type PaymentProviderKey = keyof typeof PAYMENT_PROVIDER_IDS;

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderKey, string> = {
  LEMONSQUEEZY: "Lemon Squeezy (Card, Stripe, PayPal)",
  PAYMONGO: "GCash / PayMongo",
  MAYA: "Maya (GCash, cards, e-wallets)",
};

export async function startMedusaCheckout(input: {
  lines: MedusaCheckoutLine[];
  email?: string;
  providerId?: string;
}): Promise<MedusaCheckoutResult> {
  if (typeof window === "undefined") {
    throw new Error("Medusa checkout must run in the browser.");
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

  const { cart: created } = await sdk.store.cart.create({
    region_id: regionId,
  });
  const cartId = created?.id;
  if (!cartId) {
    throw new Error("Medusa did not return a cart id.");
  }

  for (const line of input.lines) {
    await sdk.store.cart.createLineItem(cartId, {
      variant_id: line.variantId,
      quantity: line.quantity,
    });
  }

  if (input.email?.trim()) {
    await sdk.store.cart.update(cartId, { email: input.email.trim() });
  }

  const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
    cart_id: cartId,
  });
  const firstOption = shipping_options?.[0];
  if (!firstOption?.id) {
    throw new Error(
      "No shipping options available for this cart. Check Medusa region and shipping setup.",
    );
  }

  await sdk.store.cart.addShippingMethod(cartId, { option_id: firstOption.id });

  const { cart } = await sdk.store.cart.retrieve(cartId, {
    fields: "+payment_collection,*payment_collection.payment_sessions",
  } as never);

  const { payment_collection } = await sdk.store.payment.initiatePaymentSession(
    cart,
    {
      provider_id: providerId,
      data: {},
    },
  );

  const sessions = payment_collection?.payment_sessions ?? [];
  const session =
    sessions.find(
      (s: { provider_id?: string }) => s.provider_id === providerId,
    ) ?? sessions[0];
  const data = session?.data as Record<string, unknown> | undefined;
  const checkoutUrl = data?.checkout_url;
  if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://")) {
    throw new Error(
      "Medusa payment session did not return a checkout URL. Check provider configuration.",
    );
  }

  const entry = Object.entries(PAYMENT_PROVIDER_IDS).find(
    ([, id]) => id === providerId,
  );
  const providerLabel = entry
    ? PAYMENT_PROVIDER_LABELS[entry[0] as PaymentProviderKey]
    : "Payment";

  return { checkoutUrl, cartId, providerLabel };
}

/** @deprecated Use startMedusaCheckout with providerId */
export async function startMedusaLemonCheckout(input: {
  lines: MedusaCheckoutLine[];
  email?: string;
}): Promise<MedusaCheckoutResult> {
  return startMedusaCheckout({
    ...input,
    providerId: PAYMENT_PROVIDER_IDS.LEMONSQUEEZY,
  });
}
