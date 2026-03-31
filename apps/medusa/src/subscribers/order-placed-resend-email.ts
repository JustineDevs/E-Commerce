import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createHmac } from "crypto";
import { emitOrderPlacedFunnelEvent } from "../lib/commerce-funnel-sink";

function buildTrackingUrl(baseUrl: string, id: string): string | null {
  const secret = process.env.TRACKING_HMAC_SECRET?.trim();
  if (!secret) return null;
  const hmac = createHmac("sha256", secret);
  hmac.update(id);
  const token = hmac.digest("base64url");
  const cleanBase = baseUrl.replace(/\/$/, "");
  return `${cleanBase}/track/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(params: {
  orderNumber: string;
  trackingUrl: string;
  brandName: string;
}): string {
  const safeNum = escapeHtml(params.orderNumber);
  const safeUrl = escapeHtml(params.trackingUrl);
  const brand = escapeHtml(params.brandName);
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1e293b;">
 <p style="font-size:14px;color:#64748b;">${brand}</p>
 <h1 style="font-size:20px;">Order placed</h1>
 <p>Order <strong>${safeNum}</strong> is confirmed. Track status anytime:</p>
 <p><a href="${safeUrl}" style="color:#0f766e;font-weight:600;">View order status &amp; shipments</a></p>
</body></html>`;
}

export default async function orderPlacedResendEmail({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    warn?: (m: string) => void;
    info?: (m: string) => void;
  };

  const orderModule = container.resolve(Modules.ORDER);
  const order = await orderModule.retrieveOrder(data.id, {
    relations: ["customer"],
  }) as { email?: string; id?: string; display_id?: number; customer?: { email?: string } | null };

  const orderDisplayLabel =
    order.display_id != null ? String(order.display_id) : String(order.id ?? data.id);
  try {
    await emitOrderPlacedFunnelEvent({
      logger: logger as { info?: (msg: string) => void },
      orderId: String(order.id ?? data.id),
      displayId: orderDisplayLabel,
      channel: "store",
    });
  } catch {
    /* funnel sink must not block checkout email */
  }

  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const brand =
    process.env.RESEND_BRAND_NAME?.trim() || "Maharlika Apparel Custom";
  const storefrontBase =
    process.env.STOREFRONT_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";

  if (!key || !from || !storefrontBase) {
    return;
  }

  const emailRaw =
    (typeof order.email === "string" && order.email.trim()) ||
    (order.customer &&
    typeof order.customer === "object" &&
    order.customer !== null &&
    "email" in order.customer &&
    typeof order.customer.email === "string"
      ? order.customer.email.trim()
      : "") ||
    "";

  if (!emailRaw) {
    logger.warn?.(`[resend] order ${data.id} has no email; skip notification.`);
    return;
  }

  const orderId = String(order.id ?? data.id);
  const url = buildTrackingUrl(storefrontBase, orderId);
  const trackingUrl =
    url ??
    `${storefrontBase.replace(/\/$/, "")}/track/${encodeURIComponent(orderId)}`;

  const { sendResendTransactionalEmail } = await import(
    "@apparel-commerce/resend-mail"
  );
  const sent = await sendResendTransactionalEmail({
    apiKey: key,
    from,
    to: emailRaw,
    subject: `Your order ${orderDisplayLabel}: tracking`,
    html: buildHtml({
      orderNumber: orderDisplayLabel,
      trackingUrl,
      brandName: brand,
    }),
    tags: [{ name: "type", value: "order_tracking" }],
  });

  if (!sent.ok) {
    logger.warn?.(`[resend] ${sent.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
