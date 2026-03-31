import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createTracking, detectCourier } from "../lib/aftership-sdk-client";

type FulfillmentCreatedData = {
  order_id: string;
  fulfillment_id: string;
  no_notification?: boolean;
};

export default async function orderFulfillmentAftershipHandler({
  event: { data },
  container,
}: SubscriberArgs<FulfillmentCreatedData>) {
  const apiKey = process.env.AFTERSHIP_API_KEY?.trim();
  if (!apiKey) {
    return;
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    info: (m: string) => void;
    warn: (m: string) => void;
  };

  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  const fulfillment = await fulfillmentModule.retrieveFulfillment(data.fulfillment_id, {
    relations: ["labels"],
  });

  const label = fulfillment.labels?.[0];
  const trackingNumber = label?.tracking_number?.trim();
  if (!trackingNumber) {
    logger.warn?.(
      `[aftership] fulfillment ${data.fulfillment_id} has no label tracking number; skip AfterShip create.`
    );
    return;
  }

  let slug = process.env.AFTERSHIP_COURIER_SLUG?.trim() || "";
  if (!slug) {
    const couriers = await detectCourier(trackingNumber);
    slug = couriers[0]?.slug || "jtexpress-ph";
    if (couriers.length > 0) {
      logger.info?.(
        `[aftership] auto-detected courier ${slug} (${couriers[0]?.name}) for ${trackingNumber}`
      );
    }
  }

  try {
    const result = await createTracking({
      trackingNumber,
      slug,
      orderId: data.order_id,
    });

    await fulfillmentModule.updateFulfillment(data.fulfillment_id, {
      metadata: {
        ...((fulfillment.metadata as Record<string, unknown>) ?? {}),
        aftership_tracking_id: result.id ?? null,
        aftership_slug: result.slug,
        aftership_registered_at: new Date().toISOString(),
      },
    });

    logger.info?.(
      `[aftership] registered ${trackingNumber} (${slug}) for order ${data.order_id} fulfillment ${data.fulfillment_id}`
    );
  } catch (err) {
    logger.warn?.(
      `[aftership] create tracking failed for ${trackingNumber}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
};
