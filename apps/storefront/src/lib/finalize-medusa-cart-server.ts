import { buildTrackingUrl, DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";

import { createStorefrontMedusaSdk } from "@/lib/medusa-sdk";

export type MedusaCartCompleteResult =
  | {
      ok: true;
      orderId: string;
      redirectUrl: string;
      attempts: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
      attempts: number;
    };

type CompleteResponse = {
  type?: string;
  order?: { id?: string };
  error?: { message?: string } | string;
};

/**
 * Server-only: completes the Medusa cart and builds tracking URL. Used by API routes and cron recovery.
 */
export async function finalizeMedusaCartFromServer(cartId: string): Promise<MedusaCartCompleteResult> {
  const sdk = createStorefrontMedusaSdk();
  const storeCart = sdk.store.cart as unknown as {
    complete?: (id: string, body?: unknown) => Promise<CompleteResponse>;
  };
  if (typeof storeCart.complete !== "function") {
    return {
      ok: false,
      status: 501,
      error: "Cart completion is not available",
      attempts: 0,
    };
  }

  let completed = await storeCart.complete(cartId, {});
  let attempts = 1;
  const maxExtraAttempts = 5;
  for (let attempt = 1; attempt <= maxExtraAttempts; attempt++) {
    if (completed?.type === "order" && completed.order?.id) {
      break;
    }
    await new Promise((r) => setTimeout(r, 280 + attempt * 120));
    completed = await storeCart.complete(cartId, {});
    attempts += 1;
  }

  if (completed?.type !== "order" || !completed.order?.id) {
    const errMsg =
      typeof completed?.error === "string"
        ? completed.error
        : completed?.error &&
            typeof completed.error === "object" &&
            "message" in completed.error
          ? String((completed.error as { message?: string }).message)
          : "Order not ready";
    return { ok: false, status: 409, error: errMsg, attempts };
  }

  const orderId = completed.order.id;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_PUBLIC_SITE_ORIGIN;
  const redirectUrl = buildTrackingUrl(base, orderId);
  if (!redirectUrl) {
    return {
      ok: false,
      status: 503,
      error: "Tracking URL is not configured",
      attempts,
    };
  }

  return { ok: true, orderId, redirectUrl, attempts };
}
