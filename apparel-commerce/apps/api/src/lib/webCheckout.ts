import {
  createSupabaseClient,
  createPendingCheckoutOrder,
  attachLemonSqueezyCheckoutToPayment,
} from "@apparel-commerce/database";
import { createLemonSqueezyCheckout } from "./lemonsqueezy.js";
import { signOrderTrackingToken } from "./trackingToken.js";

type CheckoutItem = { variantId: string; quantity: number };

export async function performLemonSqueezyCheckoutFromItems(params: {
  items: CheckoutItem[];
  email?: string;
}): Promise<{
  checkoutUrl: string;
  orderId: string;
  orderNumber: string;
  trackingToken: string;
}> {
  const ttl = Math.min(parseInt(process.env.RESERVATION_TTL_MINUTES ?? "30", 10) || 30, 120);

  const normalized = params.items
    .map((i) => ({
      variantId: String(i.variantId ?? ""),
      quantity: Math.max(0, Math.floor(Number(i.quantity) || 0)),
    }))
    .filter((i) => i.variantId && i.quantity > 0);

  if (normalized.length === 0) {
    throw new Error("EMPTY_CART");
  }

  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_CHECKOUT_VARIANT_ID;
  if (!storeId || !variantId) {
    throw new Error("PAYMENTS_DISABLED");
  }

  const supabase = createSupabaseClient();
  const order = await createPendingCheckoutOrder(supabase, {
    items: normalized,
    reservationTtlMinutes: ttl,
  });

  const customPriceCents = Math.max(1, Math.round(Number(order.grandTotal) * 100));

  const ls = await createLemonSqueezyCheckout({
    storeId,
    variantId,
    customPriceCents,
    customData: { order_id: order.orderId },
    customerEmail: params.email,
  });

  await attachLemonSqueezyCheckoutToPayment(supabase, order.orderId, ls.checkoutId, ls.checkoutUrl);

  return {
    checkoutUrl: ls.checkoutUrl,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    trackingToken: signOrderTrackingToken(order.orderId),
  };
}
