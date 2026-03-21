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
};

export async function startMedusaLemonCheckout(input: {
  lines: MedusaCheckoutLine[];
  email?: string;
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
  const providerId = getMedusaPaymentProviderId();

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
    sessions.find((s: { provider_id?: string }) =>
      String(s.provider_id ?? "").includes("lemonsqueezy"),
    ) ?? sessions[0];
  const data = session?.data as Record<string, unknown> | undefined;
  const checkoutUrl = data?.checkout_url;
  if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://")) {
    throw new Error(
      "Medusa payment session did not return a Lemon Squeezy checkout URL.",
    );
  }

  return { checkoutUrl, cartId };
}
