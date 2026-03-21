import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

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

  const slug = process.env.AFTERSHIP_COURIER_SLUG?.trim() || "jtexpress-ph";

  const res = await fetch("https://api.aftership.com/v4/trackings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "aftership-api-key": apiKey,
    },
    body: JSON.stringify({
      tracking_number: trackingNumber,
      slug,
      custom_fields: { medusa_order_id: data.order_id },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.warn?.(`[aftership] create tracking failed ${res.status} ${text}`);
    return;
  }

  const json = (await res.json().catch(() => null)) as {
    data?: { id?: string };
  } | null;
  const trackingId = json?.data?.id;

  await fulfillmentModule.updateFulfillment(data.fulfillment_id, {
    metadata: {
      ...((fulfillment.metadata as Record<string, unknown>) ?? {}),
      aftership_tracking_id: trackingId ?? null,
      aftership_registered_at: new Date().toISOString(),
    },
  });

  logger.info?.(
    `[aftership] registered ${trackingNumber} for order ${data.order_id} fulfillment ${data.fulfillment_id}`
  );
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
};
