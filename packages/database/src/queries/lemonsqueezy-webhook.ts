function extractCustomOrderId(payload: Record<string, unknown>): string | undefined {
  const meta = payload.meta as { custom_data?: { order_id?: string } } | undefined;
  const fromMeta = meta?.custom_data?.order_id;
  if (fromMeta) return fromMeta;

  const data = payload.data as
    | { attributes?: { checkout_data?: { custom?: { order_id?: string } } } }
    | undefined;
  return data?.attributes?.checkout_data?.custom?.order_id;
}

export function parseLemonOrderPaidWebhook(
  payload: Record<string, unknown>
): { orderId: string; lemonsqueezyOrderId: string } | null {
  const meta = payload.meta as { event_name?: string } | undefined;
  if (meta?.event_name !== "order_created") return null;

  const orderId = extractCustomOrderId(payload);
  const data = payload.data as { id?: string; attributes?: { status?: string } } | undefined;
  const lsId = data?.id;
  const status = (data?.attributes?.status ?? "").toLowerCase();
  if (!orderId || !lsId || status !== "paid") return null;
  return { orderId, lemonsqueezyOrderId: lsId };
}
