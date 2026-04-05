import { createStorefrontMedusaSdk } from "./medusa-sdk";
import {
  getMedusaPublishableKey,
  getMedusaRegionId,
} from "./storefront-medusa-env";

type TrackPayload = {
  order: Record<string, unknown> & {
    id?: string;
    order_number?: string;
    status?: string;
  };
  shipments: Array<{
    id: string;
    tracking_number?: string;
    status?: string;
    carrier_slug?: string;
  }>;
};

export function orderTrackStatusFromMedusa(order: Record<string, unknown>): string {
  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const after =
    typeof meta.aftership_status === "string" ? meta.aftership_status : "";
  if (after === "delivered") return "delivered";
  if (after === "out_for_delivery") return "shipped";
  if (after === "in_transit" || after === "pending") return "shipped";

  const pay = String(order.payment_status ?? "");
  if (pay !== "captured" && pay !== "partially_captured") {
    return "pending_payment";
  }

  const ful = String(order.fulfillment_status ?? "");
  if (ful === "delivered" || ful === "partially_delivered") return "delivered";
  if (
    ful === "shipped" ||
    ful === "partially_shipped" ||
    ful === "fulfilled" ||
    ful === "partially_fulfilled"
  ) {
    return "shipped";
  }
  return "paid";
}

function mapMedusaOrderToTrack(order: Record<string, unknown>): TrackPayload {
  const fulfillments = (order.fulfillments ?? []) as Array<
    Record<string, unknown>
  >;
  const shipments: TrackPayload["shipments"] = [];

  for (const f of fulfillments) {
    const labels = (f.labels ?? []) as Array<Record<string, unknown>>;
    if (labels.length > 0) {
      for (const l of labels) {
        shipments.push({
          id: String(l.id ?? f.id ?? "lbl"),
          tracking_number:
            typeof l.tracking_number === "string"
              ? l.tracking_number
              : undefined,
          status: orderTrackStatusFromMedusa(order),
          carrier_slug:
            typeof f.provider_id === "string" ? f.provider_id : undefined,
        });
      }
    } else {
      shipments.push({
        id: String(f.id ?? "ful"),
        tracking_number: undefined,
        status:
          typeof f.shipped_at === "string" || f.shipped_at
            ? "shipped"
            : "pending",
        carrier_slug:
          typeof f.provider_id === "string" ? f.provider_id : undefined,
      });
    }
  }

  const displayId =
    order.display_id != null
      ? String(order.display_id)
      : String(order.id ?? "");

  return {
    order: {
      ...order,
      id: typeof order.id === "string" ? order.id : undefined,
      order_number: displayId,
      status: orderTrackStatusFromMedusa(order),
    },
    shipments,
  };
}

export async function fetchMedusaTrackByOrderId(orderId: string): Promise<{
  ok: boolean;
  data: TrackPayload | null;
  status: number;
}> {
  const key = getMedusaPublishableKey();
  if (!key) {
    return { ok: false, data: null, status: 503 };
  }
  try {
    const sdk = createStorefrontMedusaSdk();
    const { order } = await sdk.store.order.retrieve(orderId, {
      fields:
        "*fulfillments,*fulfillments.labels,+metadata,+payment_status,+fulfillment_status,+display_id",
    } as never);
    if (!order) {
      return { ok: false, data: null, status: 404 };
    }
    return {
      ok: true,
      data: mapMedusaOrderToTrack(order as unknown as Record<string, unknown>),
      status: 200,
    };
  } catch {
    return { ok: false, data: null, status: 404 };
  }
}

export async function fetchMedusaTrackByCartId(cartId: string): Promise<{
  ok: boolean;
  data: TrackPayload | null;
  status: number;
}> {
  const key = getMedusaPublishableKey();
  const regionId = getMedusaRegionId();
  if (!key || !regionId) {
    return { ok: false, data: null, status: 503 };
  }
  try {
    const sdk = createStorefrontMedusaSdk();
    const { cart } = await sdk.store.cart.retrieve(cartId, {
      fields:
        "id,completed_at,+order_id,*customer,*items,+total,*order,*order.fulfillments,*order.fulfillments.labels,+order.metadata,+order.payment_status,+order.fulfillment_status,+order.display_id",
    } as never);

    const cartRec = cart as unknown as Record<string, unknown> | undefined;
    const orderRaw = cartRec?.order as Record<string, unknown> | undefined;
    const linkedOrderId =
      orderRaw && typeof orderRaw.id === "string"
        ? orderRaw.id
        : typeof cartRec?.order_id === "string"
          ? cartRec.order_id
          : undefined;
    if (linkedOrderId) {
      return fetchMedusaTrackByOrderId(linkedOrderId);
    }

    if (cart?.completed_at) {
      return {
        ok: true,
        data: {
          order: {
            id: cartId,
            order_number: String(cartId).replace(/^cart_/, ""),
            status: "pending_payment",
          },
          shipments: [],
        },
        status: 200,
      };
    }

    return {
      ok: true,
      data: {
        order: {
          id: cartId,
          order_number: String(cartId).replace(/^cart_/, ""),
          status: "pending_payment",
        },
        shipments: [],
      },
      status: 200,
    };
  } catch {
    return { ok: false, data: null, status: 404 };
  }
}
