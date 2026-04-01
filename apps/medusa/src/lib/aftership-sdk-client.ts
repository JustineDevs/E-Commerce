import { MarkTrackingCompletedByIdRequestReason } from "@aftership/tracking-sdk/dist/model/MarkTrackingCompletedByIdRequestReason";

type AfterShipModule = typeof import("@aftership/tracking-sdk");
type AfterShipInstance = InstanceType<AfterShipModule["AfterShip"]>;

let aftershipModPromise: Promise<
  typeof import("@aftership/tracking-sdk")
> | null = null;

function loadAftershipMod() {
  if (!aftershipModPromise) {
    aftershipModPromise = import("@aftership/tracking-sdk");
  }
  return aftershipModPromise;
}

let _client: AfterShipInstance | null = null;

export async function getAfterShipClient(): Promise<AfterShipInstance | null> {
  const apiKey = process.env.AFTERSHIP_API_KEY?.trim();
  if (!apiKey) return null;
  if (!_client) {
    const { AfterShip } = await loadAftershipMod();
    _client = new AfterShip({ api_key: apiKey });
  }
  return _client;
}

export type AfterShipTrackingInput = {
  trackingNumber: string;
  slug?: string;
  orderId: string;
  title?: string;
  customerEmail?: string;
  customerPhone?: string;
};

async function resolveTrackingId(
  client: AfterShipInstance,
  slug: string,
  trackingNumber: string,
): Promise<string | null> {
  const res = await client.tracking.getTrackings({
    slug,
    tracking_numbers: trackingNumber,
    limit: 1,
  });
  const list = res.data.trackings ?? [];
  const normalized = trackingNumber.trim().toLowerCase();
  const match = list.find(
    (t) =>
      t.slug === slug &&
      String(t.tracking_number ?? "")
        .trim()
        .toLowerCase() === normalized,
  );
  return match?.id != null ? String(match.id) : null;
}

export async function createTracking(input: AfterShipTrackingInput): Promise<{
  id: string;
  slug: string;
  trackingNumber: string;
}> {
  const client = await getAfterShipClient();
  if (!client) throw new Error("AfterShip API key not configured.");

  const slug = input.slug || process.env.AFTERSHIP_COURIER_SLUG?.trim() || "jtexpress-ph";

  const customers: Array<{
    role?: string;
    email?: string;
    phone_number?: string;
  }> = [];
  const row: { role?: string; email?: string; phone_number?: string } = {
    role: "customer",
  };
  if (input.customerEmail) row.email = input.customerEmail;
  if (input.customerPhone) row.phone_number = input.customerPhone;
  if (row.email || row.phone_number) customers.push(row);

  const result = await client.tracking.createTracking({
    tracking_number: input.trackingNumber,
    slug,
    title: input.title,
    order_id: input.orderId,
    custom_fields: { medusa_order_id: input.orderId },
    ...(customers.length ? { customers } : {}),
  });

  const t = result.data;
  return {
    id: String(t.id ?? ""),
    slug: String(t.slug ?? slug),
    trackingNumber: String(t.tracking_number ?? input.trackingNumber),
  };
}

export async function getTracking(
  slug: string,
  trackingNumber: string,
): Promise<Record<string, unknown> | null> {
  const client = await getAfterShipClient();
  if (!client) return null;

  try {
    const id = await resolveTrackingId(client, slug, trackingNumber);
    if (!id) return null;
    const res = await client.tracking.getTrackingById(id);
    return res.data as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function retrackTracking(
  slug: string,
  trackingNumber: string,
): Promise<boolean> {
  const client = await getAfterShipClient();
  if (!client) return false;

  try {
    const id = await resolveTrackingId(client, slug, trackingNumber);
    if (!id) return false;
    await client.tracking.retrackTrackingById(id);
    return true;
  } catch {
    return false;
  }
}

export async function markTrackingComplete(
  slug: string,
  trackingNumber: string,
): Promise<boolean> {
  const client = await getAfterShipClient();
  if (!client) return false;

  try {
    const id = await resolveTrackingId(client, slug, trackingNumber);
    if (!id) return false;
    await client.tracking.markTrackingCompletedById(id, {
      reason: MarkTrackingCompletedByIdRequestReason.DELIVERED,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteTracking(
  slug: string,
  trackingNumber: string,
): Promise<boolean> {
  const client = await getAfterShipClient();
  if (!client) return false;

  try {
    const id = await resolveTrackingId(client, slug, trackingNumber);
    if (!id) return false;
    await client.tracking.deleteTrackingById(id);
    return true;
  } catch {
    return false;
  }
}

export async function detectCourier(
  trackingNumber: string,
): Promise<Array<{ slug: string; name: string }>> {
  const client = await getAfterShipClient();
  if (!client) return [];

  try {
    const result = await client.courier.detectCourier({
      tracking_number: trackingNumber,
    });
    const couriers = result.data.couriers;
    return (couriers ?? []).map((c) => ({
      slug: String(c.slug ?? ""),
      name: String(c.name ?? ""),
    }));
  } catch {
    return [];
  }
}
